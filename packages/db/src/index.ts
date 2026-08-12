import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import path from 'path';
import fs from 'fs';

export * from './schema.js';

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

const connectionString = process.env.DATABASE_URL || 'postgresql://admin:ZAQ!xsw21122@localhost:5432/seo_platform';
export const client = postgres(connectionString);
export const db = drizzle(client, { schema });
export { sql } from 'drizzle-orm';

