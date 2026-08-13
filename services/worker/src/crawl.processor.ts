import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Worker, Job, UnrecoverableError } from 'bullmq';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as crypto from 'crypto';
import { clickhouse } from '@seo/clickhouse';
import { db, ingestionFences, jobRuns, projects, sites, workspaces } from '@seo/db';
import { and, eq } from 'drizzle-orm';
import axios from 'axios';
import { crawlSuccessCounter, jobDeadLetterCounter } from './metrics';
import { isRetryableJobError, isValidJobEnvelope, JobEnvelope, JobProcessingError, nonRetryableJobError } from '@seo/core';

interface CrawlJobData extends JobEnvelope {
  workspaceId: string;
  siteId: string;
  userAgent?: string;
  ingestionKey?: string;
}

function isCrawlKillSwitchEnabled(): boolean {
  return process.env.CRAWL_KILL_SWITCH?.trim().toLowerCase() === 'true';
}

@Injectable()
export class CrawlProcessor implements OnModuleInit, OnModuleDestroy {
  private worker: Worker;
  private s3Client: S3Client;
  private crawlerApiUrl: string;

  constructor() {
    this.crawlerApiUrl = process.env.CRAWLER_API_URL || process.env.CRAWLER_SERVICE_URL || 'http://localhost:8081/crawl';
    
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
        try {
          await this.markActive(job);
          await this.handleCrawlJob(job);
        } catch (error) {
          if (!isRetryableJobError(error)) {
            throw new UnrecoverableError(error instanceof Error ? error.message : 'Non-retryable crawl job failure');
          }

          throw error;
        }
      },
      {
        connection: {
          host: redisHost,
          port: redisPort,
        },
        concurrency: 5,
      },
    );

    this.worker.on('completed', async (job) => {
      await this.markCompleted(job);
      console.log(`Job ${job.id} completed successfully.`);
    });

    this.worker.on('failed', async (job, err) => {
      if (job && this.isFinalFailure(job, err)) {
        await this.markFailed(job, err);
      }
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
    const { workspaceId, siteId, userAgent } = job.data;

    if (!isValidJobEnvelope(job.data) || !workspaceId || !siteId) {
      throw nonRetryableJobError(
        'invalid_payload',
        'Invalid crawl job data: schema version, correlation ID, idempotency key, workspaceId, and siteId are required',
      );
    }

    if (isCrawlKillSwitchEnabled()) {
      throw nonRetryableJobError('crawl_disabled', 'Crawling is temporarily disabled by an operator');
    }

    const siteResult = await db
      .select({
        id: sites.id,
        domain: sites.domain,
        workspaceCrawlEnabled: workspaces.crawlEnabled,
        projectCrawlEnabled: projects.crawlEnabled,
      })
      .from(sites)
      .innerJoin(projects, eq(sites.projectId, projects.id))
      .innerJoin(workspaces, eq(projects.workspaceId, workspaces.id))
      .where(and(eq(sites.id, siteId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (siteResult.length === 0) {
      throw nonRetryableJobError('tenant_scope_violation', 'Crawl job site does not belong to the requested workspace');
    }

    if (!siteResult[0].workspaceCrawlEnabled || !siteResult[0].projectCrawlEnabled) {
      throw nonRetryableJobError('crawl_disabled', 'Crawling is disabled for this workspace or project');
    }

    const url = `http://${siteResult[0].domain}`;
    console.log(`Processing crawl job ${job.id} for site: ${siteId}`);

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
      crawlSuccessCounter.inc({ status: 'failed', reason: 'api_request_failed' });
      throw new Error(`Go Crawler API failed: ${error.message}`);
    }

    if (!crawlResult.success) {
      const errStr = (crawlResult.error || '').toLowerCase();
      if (errStr.includes('redirect') || errStr.includes('too many redirects') || errStr.includes('loop')) {
        console.warn(`Redirect loop or issue detected for URL ${url}: ${crawlResult.error}`);
        const clickhouseDb = process.env.CLICKHOUSE_DB || 'seo_platform';
        const timestampStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
        try {
          await clickhouse.insert({
            table: `${clickhouseDb}.crawl_page_observations`,
            values: [
              {
                timestamp: timestampStr,
                site_id: siteId,
                url,
                status_code: 310, // Standard loop code
                title: '',
                meta_description: '',
                load_time_ms: 0,
                page_size_bytes: 0,
                word_count: 0,
                issues: ['redirect_loop'],
                canonical_url: '',
              },
            ],
            format: 'JSONEachRow',
          });
          console.log(`Recorded redirect loop observation in ClickHouse for site: ${siteId}`);
          crawlSuccessCounter.inc({ status: 'failed', reason: 'redirect_loop' });
          return;
        } catch (dbErr) {
          console.error(`Failed to insert redirect loop to ClickHouse:`, dbErr.message);
        }
      } else if (errStr.includes('blocked by robots.txt')) {
        console.warn(`Robots.txt block detected for URL ${url}: ${crawlResult.error}`);
        const clickhouseDb = process.env.CLICKHOUSE_DB || 'seo_platform';
        const timestampStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
        try {
          await clickhouse.insert({
            table: `${clickhouseDb}.crawl_page_observations`,
            values: [
              {
                timestamp: timestampStr,
                site_id: siteId,
                url,
                status_code: 403,
                title: '',
                meta_description: '',
                load_time_ms: 0,
                page_size_bytes: 0,
                word_count: 0,
                issues: ['robots_blocked'],
                canonical_url: '',
              },
            ],
            format: 'JSONEachRow',
          });
          console.log(`Recorded robots.txt block observation in ClickHouse for site: ${siteId}`);
          crawlSuccessCounter.inc({ status: 'failed', reason: 'robots_blocked' });
          return;
        } catch (dbErr) {
          console.error(`Failed to insert robots.txt block to ClickHouse:`, dbErr.message);
        }
      }
      crawlSuccessCounter.inc({ status: 'failed', reason: crawlResult.error || 'unknown_crawler_error' });
      throw new Error(`Go Crawler returned failure: ${crawlResult.error}`);
    }

    console.log(`Successfully crawled ${url}. Status: ${crawlResult.statusCode}, wordCount: ${crawlResult.wordCount}`);

    // Acquire the durable fence before any raw or normalized writes so a replay
    // cannot overwrite an immutable artifact or duplicate historical facts.
    const shouldWriteObservation = await this.acquireIngestionFence(job);
    if (!shouldWriteObservation) {
      console.log(`Crawl ingestion already completed for key ${job.data.ingestionKey || job.data.idempotencyKey}.`);
      return;
    }

    // 2. Store an immutable raw artifact before normalizing it into ClickHouse.
    // The run-scoped key preserves historical evidence; the legacy latest key only
    // supports detectors that have not yet been migrated to artifact references.
    const bucketName = process.env.S3_BUCKET || process.env.S3_BUCKET_NAME || 'seo-platform-raw';
    const ingestionKey = job.data.ingestionKey || job.data.idempotencyKey;
    const urlHash = crypto.createHash('sha256').update(url).digest('hex');
    const rawArtifactKey = `raw/crawl/${workspaceId}/${siteId}/${ingestionKey}/${urlHash}.html`;
    const latestArtifactKey = `crawl/${siteId}/${urlHash}.html`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: rawArtifactKey,
          Body: crawlResult.rawHtml || '',
          ContentType: 'text/html',
          Metadata: {
            workspace_id: workspaceId,
            site_id: siteId,
            ingestion_key: ingestionKey,
          },
        }),
      );
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: latestArtifactKey,
          Body: crawlResult.rawHtml || '',
          ContentType: 'text/html',
        }),
      );
      console.log(`Stored raw crawl artifact for site ${siteId} with correlation ${job.data.correlationId}`);
    } catch (error) {
      console.error(`Failed to store raw crawl artifact for correlation ${job.data.correlationId}:`, error.message);
      throw error;
    }

    // 3. Write observations to ClickHouse
    const clickhouseDb = process.env.CLICKHOUSE_DB || 'seo_platform';
    const timestampStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Simple issue heuristics for initial crawler release
    const issues: string[] = [];
    if (!crawlResult.title) issues.push('missing_title');
    if (!crawlResult.metaDescription) issues.push('missing_meta_description');
    if (crawlResult.statusCode >= 400) issues.push('error_status_code');
    if (crawlResult.wordCount < 200) issues.push('thin_content');

    const robotsMeta = (crawlResult.robotsMeta || '').toLowerCase();
    if (robotsMeta.includes('noindex')) {
      issues.push('noindex');
    }

    let canonicalUrl = crawlResult.canonicalUrl || '';
    if (!canonicalUrl) {
      issues.push('missing_canonical');
    } else {
      try {
        const pageUrlObj = new URL(url);
        const siteDomain = pageUrlObj.hostname;
        const siteProtocol = pageUrlObj.protocol;

        let canonicalUrlObj: URL;
        if (canonicalUrl.startsWith('/') || !canonicalUrl.includes('://')) {
          canonicalUrl = new URL(canonicalUrl, url).href;
          canonicalUrlObj = new URL(canonicalUrl);
        } else {
          canonicalUrlObj = new URL(canonicalUrl);
        }

        if (canonicalUrlObj.hostname !== siteDomain) {
          issues.push('canonical_domain_mismatch');
        }
        if (siteProtocol === 'https:' && canonicalUrlObj.protocol === 'http:') {
          issues.push('canonical_protocol_mismatch');
        }
      } catch (err) {
        issues.push('canonical_invalid');
      }
    }

    let finalStatusCode = crawlResult.statusCode;
    if (crawlResult.redirectChain && crawlResult.redirectChain.length > 0) {
      if (crawlResult.redirectStatusCodes && crawlResult.redirectStatusCodes.length > 0) {
        finalStatusCode = crawlResult.redirectStatusCodes[0];
      } else {
        finalStatusCode = 301;
      }

      if (crawlResult.redirectChain.length > 2) {
        issues.push('multiple_redirects');
      }

      const hasTemp = (crawlResult.redirectStatusCodes || []).some(
        (code: number) => code === 302 || code === 307
      );
      if (hasTemp) {
        issues.push('temporary_redirect');
      }
    }

    try {
      await clickhouse.insert({
        table: `${clickhouseDb}.crawl_page_observations`,
        values: [
          {
            timestamp: timestampStr,
            site_id: siteId,
            url,
            status_code: finalStatusCode,
            title: crawlResult.title || '',
            meta_description: crawlResult.metaDescription || '',
            load_time_ms: crawlResult.loadTimeMs || 0,
            page_size_bytes: (crawlResult.rawHtml || '').length,
            word_count: crawlResult.wordCount || 0,
            issues,
            canonical_url: canonicalUrl,
          },
        ],
        format: 'JSONEachRow',
      });
      await this.completeIngestionFence(job);
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
      crawlSuccessCounter.inc({ status: 'success' });
    } catch (error) {
      console.error(`Failed to update PostgreSQL site record:`, error.message);
    }
  }

  private async markActive(job: Job<CrawlJobData>) {
    if (!isValidJobEnvelope(job.data) || !job.data.workspaceId) return;

    await db.update(jobRuns).set({
      state: 'active',
      attemptCount: job.attemptsMade + 1,
      errorCode: null,
      errorMessage: null,
      updatedAt: new Date(),
    }).where(and(eq(jobRuns.workspaceId, job.data.workspaceId), eq(jobRuns.idempotencyKey, job.data.idempotencyKey)));
  }

  private async acquireIngestionFence(job: Job<CrawlJobData>) {
    const ingestionKey = job.data.ingestionKey || job.data.idempotencyKey;
    const [createdFence] = await db.insert(ingestionFences).values({
      workspaceId: job.data.workspaceId,
      ingestionKey,
      ownerIdempotencyKey: job.data.idempotencyKey,
      state: 'writing',
    }).onConflictDoNothing().returning();

    if (createdFence) {
      await this.markIngestionState(job, 'writing', { ingestionStartedAt: new Date() });
      return true;
    }

    const existing = await db.select({ state: ingestionFences.state })
      .from(ingestionFences)
      .where(and(eq(ingestionFences.workspaceId, job.data.workspaceId), eq(ingestionFences.ingestionKey, ingestionKey)))
      .limit(1);

    if (existing[0]?.state === 'completed') {
      await this.markIngestionState(job, 'completed', { ingestionCompletedAt: new Date() });
      return false;
    }

    await this.markIngestionState(job, 'reconciliation_required');

    throw nonRetryableJobError(
      'ingestion_reconciliation_required',
      'Crawl ingestion fence is incomplete; operator reconciliation is required before another write',
    );
  }

  private async completeIngestionFence(job: Job<CrawlJobData>) {
    const ingestionKey = job.data.ingestionKey || job.data.idempotencyKey;
    await db.update(ingestionFences).set({
      state: 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
    }).where(and(eq(ingestionFences.workspaceId, job.data.workspaceId), eq(ingestionFences.ingestionKey, ingestionKey)));
    await this.markIngestionState(job, 'completed', { ingestionCompletedAt: new Date() });
  }

  private async markIngestionState(
    job: Job<CrawlJobData>,
    ingestionState: string,
    timestamps: { ingestionStartedAt?: Date; ingestionCompletedAt?: Date } = {},
  ) {
    await db.update(jobRuns).set({
      ingestionState,
      ...timestamps,
      updatedAt: new Date(),
    }).where(and(eq(jobRuns.workspaceId, job.data.workspaceId), eq(jobRuns.idempotencyKey, job.data.idempotencyKey)));
  }

  private async markCompleted(job: Job<CrawlJobData>) {
    if (!isValidJobEnvelope(job.data) || !job.data.workspaceId) return;

    await db.update(jobRuns).set({
      state: 'completed',
      completedAt: new Date(),
      errorCode: null,
      errorMessage: null,
      updatedAt: new Date(),
    }).where(and(eq(jobRuns.workspaceId, job.data.workspaceId), eq(jobRuns.idempotencyKey, job.data.idempotencyKey)));
  }

  private async markFailed(job: Job<CrawlJobData>, error: Error) {
    if (!isValidJobEnvelope(job.data) || !job.data.workspaceId) return;

    await db.update(jobRuns).set({
      state: 'dead_lettered',
      attemptCount: job.attemptsMade,
      errorCode: error instanceof JobProcessingError ? error.code : 'unexpected_failure',
      errorMessage: 'Crawl job failed; inspect safe worker logs with the correlation ID',
      failedAt: new Date(),
      updatedAt: new Date(),
    }).where(and(eq(jobRuns.workspaceId, job.data.workspaceId), eq(jobRuns.idempotencyKey, job.data.idempotencyKey)));
    jobDeadLetterCounter.inc({
      queue: 'crawler-queue',
      job_name: job.name,
      error_code: error instanceof JobProcessingError ? error.code : 'unexpected_failure',
    });
  }

  private isFinalFailure(job: Job<CrawlJobData>, error: Error) {
    return error instanceof UnrecoverableError || job.attemptsMade >= (job.opts.attempts || 1);
  }
}
