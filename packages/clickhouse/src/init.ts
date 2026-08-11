import { createClient } from '@clickhouse/client';
import { clickhouse } from './index.js';

export async function initializeClickHouse() {
  const targetDb = process.env.CLICKHOUSE_DB || 'seo_platform';
  console.log(`Initializing ClickHouse database: ${targetDb}...`);
  
  // Create a temporary client pointing to the 'default' database to ensure we can create our target database
  const tempClient = createClient({
    url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
    username: process.env.CLICKHOUSE_USER || 'default',
    password: process.env.CLICKHOUSE_PASSWORD || '',
    database: 'default',
  });

  console.log(`Creating database ${targetDb} if it doesn't exist...`);
  try {
    await tempClient.exec({ query: `CREATE DATABASE IF NOT EXISTS ${targetDb}` });
    console.log(`Database ${targetDb} created or already exists.`);
  } catch (error) {
    console.error(`Failed to create database ${targetDb}:`, error);
    await tempClient.close();
    throw error;
  }
  await tempClient.close();

  console.log('Initializing ClickHouse database schemas...');
  const queries = [
    `CREATE TABLE IF NOT EXISTS ${targetDb}.gsc_query_daily (
      date Date,
      site_id UUID,
      query String,
      clicks UInt64,
      impressions UInt64,
      ctr Float64,
      position Float64
    ) ENGINE = MergeTree()
    ORDER BY (site_id, date, query)`,

    `CREATE TABLE IF NOT EXISTS ${targetDb}.gsc_page_daily (
      date Date,
      site_id UUID,
      page String,
      clicks UInt64,
      impressions UInt64,
      ctr Float64,
      position Float64
    ) ENGINE = MergeTree()
    ORDER BY (site_id, date, page)`,

    `CREATE TABLE IF NOT EXISTS ${targetDb}.crawl_page_observations (
      timestamp DateTime,
      site_id UUID,
      url String,
      status_code UInt16,
      title String,
      meta_description String,
      load_time_ms UInt32,
      page_size_bytes UInt32,
      word_count UInt32,
      issues Array(String)
    ) ENGINE = MergeTree()
    ORDER BY (site_id, timestamp, url)`,

    `CREATE TABLE IF NOT EXISTS ${targetDb}.rank_observations (
      timestamp DateTime,
      project_id UUID,
      keyword String,
      rank UInt8,
      search_volume UInt32,
      url String,
      competitor_domain String
    ) ENGINE = MergeTree()
    ORDER BY (project_id, timestamp, keyword)`
  ];

  for (const query of queries) {
    try {
      await clickhouse.exec({ query });
      console.log(`Successfully created table.`);
    } catch (error) {
      console.error(`Error running query: ${query}`, error);
      throw error;
    }
  }
}
