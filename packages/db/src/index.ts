import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export * from './schema';

const connectionString = process.env.DATABASE_URL || 'postgres://seo:seo@localhost:5432/seo_platform';
export const client = postgres(connectionString);
export const db = drizzle(client, { schema });
export { sql } from 'drizzle-orm';
