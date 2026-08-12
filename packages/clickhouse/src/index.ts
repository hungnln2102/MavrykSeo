import { createClient } from '@clickhouse/client';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Try to find and load .env file from root
try {
  let currentDir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const envPath = path.join(currentDir, '.env');
    if (fs.existsSync(envPath)) {
      if (typeof (process as any).loadEnvFile === 'function') {
        (process as any).loadEnvFile(envPath);
      } else {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
          const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
          if (match) {
            const key = match[1];
            let value = match[2] || '';
            if (value.startsWith('"') && value.endsWith('"')) {
              value = value.slice(1, -1);
            } else if (value.startsWith("'") && value.endsWith("'")) {
              value = value.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        });
      }
      break;
    }
    currentDir = path.dirname(currentDir);
  }
} catch (e) {
  // ignore
}

const rawClickhouseClient = createClient({
  url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  database: process.env.CLICKHOUSE_DB || 'default',
});

// JSON-file-based mock client for environments without ClickHouse service running
class MockClickHouseClient {
  private mockFilePath: string;

  constructor() {
    this.mockFilePath = path.join(os.tmpdir(), 'clickhouse_mock_db.json');
  }

  async ping() {
    return { success: true };
  }


  private readDb(): Record<string, any[]> {
    try {
      if (fs.existsSync(this.mockFilePath)) {
        return JSON.parse(fs.readFileSync(this.mockFilePath, 'utf8'));
      }
    } catch (e) {
      // ignore
    }
    return {};
  }

  private writeDb(db: Record<string, any[]>) {
    try {
      fs.writeFileSync(this.mockFilePath, JSON.stringify(db, null, 2), 'utf8');
    } catch (e) {
      // ignore
    }
  }

  async exec(params: { query: string }) {
    console.log(`[Mock ClickHouse exec]: ${params.query}`);
    const q = params.query.toLowerCase().trim();
    if (q.includes('delete where')) {
      const dbData = this.readDb();
      // Simple parsing of DELETE query
      // e.g. ALTER TABLE database.table DELETE WHERE project_id = 'xxx'
      const tableMatch = params.query.match(/alter\s+table\s+([\w.]+)\s+delete/i);
      const projectIdMatch = params.query.match(/project_id\s*=\s*'([\w-]+)'/i);
      const siteIdMatch = params.query.match(/site_id\s*=\s*'([\w-]+)'/i);

      if (tableMatch) {
        const fullTableName = tableMatch[1];
        const tableName = fullTableName.split('.').pop() || fullTableName;
        if (dbData[tableName]) {
          if (projectIdMatch) {
            const pid = projectIdMatch[1];
            dbData[tableName] = dbData[tableName].filter(row => row.project_id !== pid);
          } else if (siteIdMatch) {
            const sid = siteIdMatch[1];
            dbData[tableName] = dbData[tableName].filter(row => row.site_id !== sid);
          } else {
            dbData[tableName] = [];
          }
          this.writeDb(dbData);
        }
      }
    }
    return { success: true };
  }

  async insert(params: { table: string; values: any[]; format?: string }) {
    console.log(`[Mock ClickHouse insert]: Table "${params.table}" with ${params.values.length} rows (File: ${this.mockFilePath})`);
    const tableName = params.table.split('.').pop() || params.table;
    const dbData = this.readDb();
    if (!dbData[tableName]) {
      dbData[tableName] = [];
    }
    dbData[tableName].push(...params.values);
    this.writeDb(dbData);
    return { success: true };
  }

  async query(params: { query: string; format?: string }) {
    console.log(`[Mock ClickHouse query]: ${params.query} (File: ${this.mockFilePath})`);
    const q = params.query.toLowerCase();
    const dbData = this.readDb();

    let rows: any[] = [];
    if (q.includes('rank_observations')) {
      const allRows = dbData['rank_observations'] || [];
      const projectIdMatch = params.query.match(/project_id\s*=\s*'([\w-]+)'/i);
      const projectId = projectIdMatch ? projectIdMatch[1] : null;

      rows = allRows.filter(row => !projectId || row.project_id === projectId);

      if (q.includes("competitor_domain = ''")) {
        // Own domain rankings
        rows = rows.filter(row => row.competitor_domain === '');
      } else if (q.includes("competitor_domain != ''")) {
        // Competitor domain rankings
        rows = rows.filter(row => row.competitor_domain !== '');
      } else if (q.includes('competitor_domain in (')) {
        // Filtered competitor domain rankings
        const domainsMatch = params.query.match(/competitor_domain\s+in\s+\(([^)]+)\)/i);
        if (domainsMatch) {
          const domains = domainsMatch[1].split(',').map(d => d.trim().replace(/'/g, ''));
          rows = rows.filter(row => domains.includes(row.competitor_domain));
        }
      }

      // Map columns to match common SQL projections (e.g. latest_rank, date)
      rows = rows.map(row => ({
        ...row,
        latest_rank: row.rank,
        date: row.timestamp ? row.timestamp.split(' ')[0] : undefined,
      }));
    } else if (q.includes('gsc_page_daily')) {
      rows = dbData['gsc_page_daily'] || [];
    } else if (q.includes('gsc_query_daily')) {
      rows = dbData['gsc_query_daily'] || [];
    } else if (q.includes('crawl_page_observations')) {
      rows = dbData['crawl_page_observations'] || [];
    }

    return {
      json: async () => rows,
    };
  }

  async close() {
    // noop
  }
}

export const clickhouse = process.env.CLICKHOUSE_MOCK !== 'false'
  ? (new MockClickHouseClient() as any)
  : rawClickhouseClient;

export * from './init.js';

