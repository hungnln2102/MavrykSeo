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
      issues Array(String),
      canonical_url String,
      redirect_chain Array(String),
      redirect_status_codes Array(UInt16),
      robots_meta String,
      job_run_id String,
      observed_at DateTime,
      ingested_at DateTime,
      schema_version String,
      algorithm_version String,
      source_origin String
    ) ENGINE = MergeTree()
    ORDER BY (site_id, timestamp, url)`,

    `CREATE TABLE IF NOT EXISTS ${targetDb}.sitemap_observations (
      timestamp DateTime,
      site_id UUID,
      sitemap_url String,
      crawled_url String,
      job_run_id String,
      observed_at DateTime
    ) ENGINE = MergeTree()
    ORDER BY (site_id, timestamp, sitemap_url, crawled_url)`,

    `CREATE TABLE IF NOT EXISTS ${targetDb}.render_observations (
      timestamp DateTime,
      site_id UUID,
      url String,
      dynamic_html_length UInt32,
      console_errors Array(String),
      screenshot_s3_key String,
      title_mismatch UInt8,
      text_parity_percent Float64,
      job_run_id String,
      observed_at DateTime
    ) ENGINE = MergeTree()
    ORDER BY (site_id, timestamp, url)`,

    `CREATE TABLE IF NOT EXISTS ${targetDb}.pagespeed_observations (
      timestamp DateTime,
      site_id UUID,
      url String,
      device String,
      fcp_ms UInt32,
      lcp_ms UInt32,
      cls Float64,
      fid_ms UInt32,
      inp_ms UInt32,
      performance_score Float64,
      accessibility_score Float64,
      best_practices_score Float64,
      seo_score Float64,
      job_run_id String,
      observed_at DateTime
    ) ENGINE = MergeTree()
    ORDER BY (site_id, timestamp, url)`,

    `CREATE TABLE IF NOT EXISTS ${targetDb}.rank_observations (
      timestamp DateTime,
      project_id UUID,
      keyword String,
      rank UInt8,
      search_volume UInt32,
      url String,
      competitor_domain String,
      device String,
      country String,
      job_run_id String,
      observed_at DateTime,
      ingested_at DateTime,
      schema_version String,
      algorithm_version String,
      source_origin String
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
      return;
    }
  }

  // Schema migration for existing installations
  try {
    console.log(`Running ClickHouse schema migration for canonical_url...`);
    await clickhouse.exec({
      query: `ALTER TABLE ${targetDb}.crawl_page_observations ADD COLUMN IF NOT EXISTS canonical_url String`,
    });
    console.log('Successfully updated crawl_page_observations schema for canonical_url.');

    console.log(`Running ClickHouse schema migration for redirect_chain...`);
    await clickhouse.exec({
      query: `ALTER TABLE ${targetDb}.crawl_page_observations ADD COLUMN IF NOT EXISTS redirect_chain Array(String)`,
    });
    await clickhouse.exec({
      query: `ALTER TABLE ${targetDb}.crawl_page_observations ADD COLUMN IF NOT EXISTS redirect_status_codes Array(UInt16)`,
    });
    await clickhouse.exec({
      query: `ALTER TABLE ${targetDb}.crawl_page_observations ADD COLUMN IF NOT EXISTS robots_meta String`,
    });
    console.log('Successfully updated crawl_page_observations schema for redirect & robots_meta.');

    console.log(`Running ClickHouse schema migration for rank_observations device/country...`);
    await clickhouse.exec({
      query: `ALTER TABLE ${targetDb}.rank_observations ADD COLUMN IF NOT EXISTS device String`,
    });
    await clickhouse.exec({
      query: `ALTER TABLE ${targetDb}.rank_observations ADD COLUMN IF NOT EXISTS country String`,
    });
    console.log('Successfully updated rank_observations schema.');

    console.log(`Running ClickHouse schema migration for shared lineage columns...`);
    const tablesToAlter = [
      `${targetDb}.crawl_page_observations`,
      `${targetDb}.rank_observations`
    ];
    const columnsToAdd = [
      'job_run_id String',
      'observed_at DateTime',
      'ingested_at DateTime',
      'schema_version String',
      'algorithm_version String',
      'source_origin String'
    ];
    for (const table of tablesToAlter) {
      for (const col of columnsToAdd) {
        await clickhouse.exec({
          query: `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col}`,
        });
      }
    }
    console.log('Successfully updated shared lineage columns in ClickHouse.');
  } catch (error) {
    console.warn(`ClickHouse migration warning: ${(error as any).message}`);
  }
}
