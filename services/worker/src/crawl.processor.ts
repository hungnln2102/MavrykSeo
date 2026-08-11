import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { clickhouse } from '@seo/clickhouse';
import { db, sites } from '@seo/db';
import { eq } from 'drizzle-orm';
import axios from 'axios';

interface CrawlJobData {
  siteId: string;
  url: string;
  userAgent?: string;
}

@Injectable()
export class CrawlProcessor implements OnModuleInit, OnModuleDestroy {
  private worker: Worker;
  private s3Client: S3Client;
  private crawlerApiUrl: string;

  constructor() {
    this.crawlerApiUrl = process.env.CRAWLER_API_URL || 'http://localhost:8081/crawl';
    
    this.s3Client = new S3Client({
      endpoint: process.env.S3_ENDPOINT || 'http://localhost:9002',
      region: process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || 'minio',
        secretAccessKey: process.env.S3_SECRET_KEY || 'minio12345',
      },
      forcePathStyle: true,
    });
  }

  onModuleInit() {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

    console.log(`Starting BullMQ worker on queue 'crawler-queue' (Redis: ${redisHost}:${redisPort})...`);

    this.worker = new Worker(
      'crawler-queue',
      async (job: Job<CrawlJobData>) => {
        await this.handleCrawlJob(job);
      },
      {
        connection: {
          host: redisHost,
          port: redisPort,
        },
        concurrency: 5,
      },
    );

    this.worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed successfully.`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed with error:`, err);
    });
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
      console.log('BullMQ worker closed.');
    }
  }

  private async handleCrawlJob(job: Job<CrawlJobData>) {
    const { siteId, url, userAgent } = job.data;
    console.log(`Processing crawl job ${job.id} for site: ${siteId}, URL: ${url}`);

    if (!siteId || !url) {
      throw new Error('Invalid crawl job data: siteId and url are required');
    }

    // 1. Invoke Go Crawler Service
    let crawlResult;
    try {
      const response = await axios.post(this.crawlerApiUrl, {
        url,
        userAgent: userAgent || 'MavrykBot/1.0',
      });
      crawlResult = response.data;
    } catch (error) {
      console.error(`Go crawler API request failed for URL ${url}:`, error.message);
      throw new Error(`Go Crawler API failed: ${error.message}`);
    }

    if (!crawlResult.success) {
      throw new Error(`Go Crawler returned failure: ${crawlResult.error}`);
    }

    console.log(`Successfully crawled ${url}. Status: ${crawlResult.statusCode}, wordCount: ${crawlResult.wordCount}`);

    // 2. Upload raw HTML to MinIO S3
    const bucketName = process.env.S3_BUCKET_NAME || 'seo-platform-raw';
    const s3Key = `crawl/${siteId}/${Date.now()}_index.html`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: s3Key,
          Body: crawlResult.rawHtml || '',
          ContentType: 'text/html',
        }),
      );
      console.log(`Uploaded raw HTML to S3: ${s3Key}`);
    } catch (error) {
      console.error(`Failed to upload raw HTML to S3:`, error.message);
      // We don't fail the whole job if S3 fails, but log it
    }

    // 3. Write observations to ClickHouse
    const clickhouseDb = process.env.CLICKHOUSE_DB || 'seo_platform';
    const timestampStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Simple issue heuristics for initial crawler release
    const issues: string[] = [];
    if (!crawlResult.title) issues.push('missing_title');
    if (!crawlResult.metaDescription) issues.push('missing_meta_description');
    if (!crawlResult.canonicalUrl) issues.push('missing_canonical');
    if (crawlResult.statusCode >= 400) issues.push('error_status_code');
    if (crawlResult.wordCount < 200) issues.push('thin_content');

    try {
      await clickhouse.insert({
        table: `${clickhouseDb}.crawl_page_observations`,
        values: [
          {
            timestamp: timestampStr,
            site_id: siteId,
            url,
            status_code: crawlResult.statusCode,
            title: crawlResult.title || '',
            meta_description: crawlResult.metaDescription || '',
            load_time_ms: crawlResult.loadTimeMs || 0,
            page_size_bytes: (crawlResult.rawHtml || '').length,
            word_count: crawlResult.wordCount || 0,
            issues,
          },
        ],
        format: 'JSONEachRow',
      });
      console.log(`Inserted crawl observation to ClickHouse for site: ${siteId}`);
    } catch (error) {
      console.error(`Failed to insert to ClickHouse:`, error.message);
      throw error;
    }

    // 4. Update Postgres site status
    try {
      await db
        .update(sites)
        .set({ updatedAt: new Date() })
        .where(eq(sites.id, siteId));
      console.log(`Updated Postgres site record for ID: ${siteId}`);
    } catch (error) {
      console.error(`Failed to update PostgreSQL site record:`, error.message);
    }
  }
}
