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

    // Forward ALTER TABLE DELETE to exec
    if (q.includes('alter table') && q.includes('delete where')) {
      await this.exec({ query: params.query });
      return { json: async () => [] };
    }

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
    } else if (q.includes('crawl_page_observations')) {
      const allRows = dbData['crawl_page_observations'] || [];
      const jobRunIdMatch = params.query.match(/job_run_id\s*=\s*'([\w-]+)'/);
      if (q.includes('job_run_id') && q.includes('order by timestamp desc')) {
        const ordered = [...allRows].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        rows = ordered.slice(0, 1);
      } else if (q.includes('count()') && q.includes('status_code = 200')) {
        const filtered = jobRunIdMatch ? allRows.filter(r => r.job_run_id === jobRunIdMatch[1]) : allRows;
        const total = filtered.length;
        const with_issues = filtered.filter(r => r.issues && r.issues.length > 0).length;
        const success = filtered.filter(r => r.status_code === 200).length;
        rows = [{ total, success, with_issues }];
      } else {
        rows = jobRunIdMatch ? allRows.filter(r => r.job_run_id === jobRunIdMatch[1]) : allRows;
      }

      if (rows.length === 0 && jobRunIdMatch) {
        const jobRunId = jobRunIdMatch[1];
        const siteIdMatch = params.query.match(/site_id\s*=\s*'([\w-]+)'/);
        const siteId = siteIdMatch ? siteIdMatch[1] : 'mock-site-id';
        rows = [
          {
            timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
            site_id: siteId,
            url: `https://mocksite.test/`,
            status_code: 200,
            title: 'Mock Website Homepage',
            meta_description: '',
            load_time_ms: 350,
            page_size_bytes: 12500,
            word_count: 520,
            issues: ['missing_meta_description'],
            canonical_url: 'https://mocksite.test/',
            redirect_chain: [],
            redirect_status_codes: [],
            robots_meta: 'index, follow',
            job_run_id: jobRunId,
            observed_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
            ingested_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
            schema_version: 'v1',
            algorithm_version: 'v1.2.0-baseline',
            source_origin: 'crawler',
          },
          {
            timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
            site_id: siteId,
            url: `https://mocksite.test/old-home`,
            status_code: 301,
            title: '',
            meta_description: '',
            load_time_ms: 120,
            page_size_bytes: 0,
            word_count: 0,
            issues: [],
            canonical_url: '',
            redirect_chain: [`https://mocksite.test/`],
            redirect_status_codes: [301],
            robots_meta: '',
            job_run_id: jobRunId,
            observed_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
            ingested_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
            schema_version: 'v1',
            algorithm_version: 'v1.2.0-baseline',
            source_origin: 'crawler',
          },
          {
            timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
            site_id: siteId,
            url: `https://mocksite.test/broken-page`,
            status_code: 404,
            title: '404 Not Found',
            meta_description: '',
            load_time_ms: 180,
            page_size_bytes: 850,
            word_count: 12,
            issues: ['error_status_code'],
            canonical_url: '',
            redirect_chain: [],
            redirect_status_codes: [],
            robots_meta: 'noindex, nofollow',
            job_run_id: jobRunId,
            observed_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
            ingested_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
            schema_version: 'v1',
            algorithm_version: 'v1.2.0-baseline',
            source_origin: 'crawler',
          }
        ];
      }
    } else if (q.includes('sitemap_observations')) {
      const allRows = dbData['sitemap_observations'] || [];
      const jobRunIdMatch = params.query.match(/job_run_id\s*=\s*'([\w-]+)'/);
      rows = jobRunIdMatch ? allRows.filter(r => r.job_run_id === jobRunIdMatch[1]) : allRows;

      if (rows.length === 0 && jobRunIdMatch) {
        const jobRunId = jobRunIdMatch[1];
        const siteIdMatch = params.query.match(/site_id\s*=\s*'([\w-]+)'/);
        const siteId = siteIdMatch ? siteIdMatch[1] : 'mock-site-id';
        rows = [
          {
            timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
            site_id: siteId,
            sitemap_url: `https://mocksite.test/sitemap.xml`,
            crawled_url: `https://mocksite.test/`,
            job_run_id: jobRunId,
            observed_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          },
          {
            timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
            site_id: siteId,
            sitemap_url: `https://mocksite.test/sitemap.xml`,
            crawled_url: `https://mocksite.test/about`,
            job_run_id: jobRunId,
            observed_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          },
          {
            timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
            site_id: siteId,
            sitemap_url: `https://mocksite.test/sitemap.xml`,
            crawled_url: `https://mocksite.test/contact`,
            job_run_id: jobRunId,
            observed_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          }
        ];
      }
    } else if (q.includes('render_observations')) {
      const allRows = dbData['render_observations'] || [];
      const jobRunIdMatch = params.query.match(/job_run_id\s*=\s*'([\w-]+)'/);
      rows = jobRunIdMatch ? allRows.filter(r => r.job_run_id === jobRunIdMatch[1]) : allRows;

      if (rows.length === 0 && jobRunIdMatch) {
        const jobRunId = jobRunIdMatch[1];
        const siteIdMatch = params.query.match(/site_id\s*=\s*'([\w-]+)'/);
        const siteId = siteIdMatch ? siteIdMatch[1] : 'mock-site-id';
        rows = [
          {
            timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
            site_id: siteId,
            url: `https://mocksite.test/`,
            dynamic_html_length: 12500,
            console_errors: ['Failed to load resource: net::ERR_CONNECTION_REFUSED at https://mocksite.test/unused.js'],
            screenshot_s3_key: `raw/screenshots/mock-ws/mock-site/mock-key/mock-homepage.png`,
            title_mismatch: 0,
            text_parity_percent: 98.5,
            job_run_id: jobRunId,
            observed_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          }
        ];
      }
    } else if (q.includes('pagespeed_observations')) {
      const allRows = dbData['pagespeed_observations'] || [];
      const jobRunIdMatch = params.query.match(/job_run_id\s*=\s*'([\w-]+)'/);
      rows = jobRunIdMatch ? allRows.filter(r => r.job_run_id === jobRunIdMatch[1]) : allRows;

      if (rows.length === 0 && jobRunIdMatch) {
        const jobRunId = jobRunIdMatch[1];
        const siteIdMatch = params.query.match(/site_id\s*=\s*'([\w-]+)'/);
        const siteId = siteIdMatch ? siteIdMatch[1] : 'mock-site-id';
        rows = [
          {
            timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
            site_id: siteId,
            url: `https://mocksite.test/`,
            device: 'mobile',
            fcp_ms: 1200,
            lcp_ms: 2400,
            cls: 0.05,
            fid_ms: 80,
            inp_ms: 150,
            performance_score: 85,
            accessibility_score: 92,
            best_practices_score: 89,
            seo_score: 95,
            job_run_id: jobRunId,
            observed_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          }
        ];
      }
    } else if (q.includes('gsc_page_daily')) {
      const allRows = dbData['gsc_page_daily'] || [];
      const siteIdsMatch = params.query.match(/site_id\s+in\s+\(([^)]+)\)/i);
      const siteIds = siteIdsMatch ? siteIdsMatch[1].split(',').map(s => s.trim().replace(/'/g, '')) : [];
      const filteredBySite = allRows.filter(r => siteIds.length === 0 || siteIds.includes(r.site_id));

      const todayVal = new Date();
      let filtered: any[] = [];
      if (q.includes('date >= today() - 30') || q.includes('subtractdays(today(), 30)')) {
        const threshold = new Date();
        threshold.setDate(todayVal.getDate() - 30);
        filtered = filteredBySite.filter(r => new Date(r.date) >= threshold);
      } else if (q.includes('date < today() - 30') || q.includes('date < subtractdays(today(), 30)')) {
        const threshold30 = new Date();
        threshold30.setDate(todayVal.getDate() - 30);
        const threshold60 = new Date();
        threshold60.setDate(todayVal.getDate() - 60);
        filtered = filteredBySite.filter(r => {
          const d = new Date(r.date);
          return d >= threshold60 && d < threshold30;
        });
      } else {
        filtered = filteredBySite;
      }

      if (q.includes('sum(clicks)') && q.includes('group by date')) {
        // Group by Date chart query
        const groupMap = new Map<string, { clicks: number; impressions: number }>();
        for (const r of filtered) {
          const val = groupMap.get(r.date) || { clicks: 0, impressions: 0 };
          val.clicks += Number(r.clicks || 0);
          val.impressions += Number(r.impressions || 0);
          groupMap.set(r.date, val);
        }
        rows = Array.from(groupMap.entries()).map(([date, val]) => ({
          date,
          clicks: val.clicks,
          impressions: val.impressions
        })).sort((a, b) => a.date.localeCompare(b.date));
      } else if (q.includes('sum(clicks)') || q.includes('sum(impressions)')) {
        // Metrics aggregation query
        const clicks = filtered.reduce((sum, r) => sum + Number(r.clicks || 0), 0);
        const impressions = filtered.reduce((sum, r) => sum + Number(r.impressions || 0), 0);
        const totalPos = filtered.reduce((sum, r) => sum + Number(r.position || 0), 0);
        const position = filtered.length > 0 ? totalPos / filtered.length : 10;
        rows = [{ clicks, impressions, position }];
      } else {
        rows = filtered;
      }
    } else if (q.includes('gsc_query_daily')) {
      const allRows = dbData['gsc_query_daily'] || [];
      const siteIdsMatch = params.query.match(/site_id\s+in\s+\(([^)]+)\)/i);
      const siteIds = siteIdsMatch ? siteIdsMatch[1].split(',').map(s => s.trim().replace(/'/g, '')) : [];
      let filtered = allRows.filter(r => siteIds.length === 0 || siteIds.includes(r.site_id));

      const todayVal = new Date();
      const threshold = new Date();
      threshold.setDate(todayVal.getDate() - 30);
      filtered = filtered.filter(r => new Date(r.date) >= threshold);

      if (q.includes('group by query')) {
        // Keywords listing query
        const groupMap = new Map<string, { clicks: number; impressions: number; ctr: number; position: number; count: number }>();
        for (const r of filtered) {
          const val = groupMap.get(r.query) || { clicks: 0, impressions: 0, ctr: 0, position: 0, count: 0 };
          val.clicks += Number(r.clicks || 0);
          val.impressions += Number(r.impressions || 0);
          val.ctr += Number(r.ctr || 0);
          val.position += Number(r.position || 0);
          val.count += 1;
          groupMap.set(r.query, val);
        }
        rows = Array.from(groupMap.entries()).map(([query, val]) => ({
          query,
          clicks: val.clicks,
          impressions: val.impressions,
          ctr: val.ctr / val.count,
          position: val.position / val.count
        })).sort((a, b) => b.clicks - a.clicks).slice(0, 10);
      } else {
        rows = filtered;
      }
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

