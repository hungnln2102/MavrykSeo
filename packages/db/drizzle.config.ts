import fs from 'fs';
import path from 'path';
import { defineConfig } from 'drizzle-kit';

function loadWorkspaceEnv(): void {
  let currentDir = process.cwd();

  for (let depth = 0; depth < 5; depth += 1) {
    const envPath = path.join(currentDir, '.env');

    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');

      for (const line of content.split(/\r?\n/)) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (!match || process.env[match[1]]) continue;

        let value = match[2] || '';
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[match[1]] = value;
      }
      return;
    }

    currentDir = path.dirname(currentDir);
  }
}

loadWorkspaceEnv();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set before running Drizzle Kit commands.');
}

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
});