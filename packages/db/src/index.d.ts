import postgres from 'postgres';
import * as schema from './schema';
export * from './schema';
export declare const client: postgres.Sql<{}>;
export declare const db: import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof schema>;
export { sql } from 'drizzle-orm';
