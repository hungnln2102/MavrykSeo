import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Worker, Job, Queue, UnrecoverableError } from 'bullmq';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import * as crypto from 'crypto';
import { clickhouse } from '@seo/clickhouse';
import { db, ingestionFences, jobRuns, projects, sites, workspaces, auditRuns } from '@seo/db';
import { and, eq, count, inArray, desc } from 'drizzle-orm';
import axios from 'axios';
import { crawlSuccessCounter, jobDeadLetterCounter } from './metrics';
import { CrawlJobData, isRetryableJobError, isValidCrawlJobData, isValidJobEnvelope, JobProcessingError, nonRetryableJobError, retryableJobError } from '@seo/core';
import { chromium } from 'playwright';
import { AuditRunCoordinator } from './audit-run.coordinator';

function isCrawlKillSwitchEnabled(): boolean {
  return process.env.CRAWL_KILL_SWITCH?.trim().toLowerCase() === 'true';
}

@Injectable()
export class CrawlProcessor implements OnModuleInit, OnModuleDestroy {
  private worker: Worker;
  private crawlerQueue: Queue;
  private s3Client: S3Client;
  private crawlerApiUrl: string;

  constructor(private readonly auditRunCoordinator: AuditRunCoordinator) {
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

    this.crawlerQueue = new Queue('crawler-queue', {
      connection: {
        host: redisHost,
        port: redisPort,
      },
    });

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

      try {
        if (isValidCrawlJobData(job.data) && job.data.workspaceId && job.data.siteId) {
          const siteId = job.data.siteId;
          const workspaceId = job.data.workspaceId;
          const siteResult = await db.select({ projectId: sites.projectId }).from(sites).where(eq(sites.id, siteId)).limit(1);
          if (siteResult.length > 0) {
            const projectId = siteResult[0].projectId;
            const [activeJobs] = await db
              .select({ value: count() })
              .from(jobRuns)
              .where(
                and(
                  eq(jobRuns.workspaceId, workspaceId),
                  eq(jobRuns.projectId, projectId),
                  eq(jobRuns.queueName, 'crawler-queue'),
                  inArray(jobRuns.state, ['queued', 'active'])
                )
              );

            if ((activeJobs?.value || 0) === 0) {
              console.log(`[CrawlProcessor] All crawl jobs completed for project ${projectId}. Triggering coordinator...`);
              const activeRuns = await db
                .select({ id: auditRuns.id })
                .from(auditRuns)
                .where(and(eq(auditRuns.projectId, projectId), eq(auditRuns.status, 'active')))
                .orderBy(desc(auditRuns.createdAt))
                .limit(1);

              if (activeRuns.length > 0) {
                await this.auditRunCoordinator.runAudit(activeRuns[0].id);
              }
            }
          }
        }
      } catch (err: any) {
        console.error('Failed to trigger AuditRunCoordinator at job completion:', err.message);
      }
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
    if (this.crawlerQueue) {
      await this.crawlerQueue.close();
      console.log('BullMQ queue closed.');
    }
  }

  private async handleCrawlJob(job: Job<CrawlJobData>) {
    const { workspaceId, siteId, userAgent } = job.data;
    const bucketName = process.env.S3_BUCKET || process.env.S3_BUCKET_NAME || 'seo-platform-raw';

    if (!isValidCrawlJobData(job.data)) {
      throw nonRetryableJobError(
        'invalid_payload',
        'Invalid crawl job data: schema version, correlation ID, idempotency key, workspaceId, siteId, and ingestion key are required',
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

    const url = job.data.targetUrl || `http://${siteResult[0].domain}`;
    
    // 1. Invoke Go Crawler Service or load from S3 for Reprocessing
    let crawlResult;
    const reprocessKey = job.data.reprocessRawArtifactKey;

    if (reprocessKey) {
      console.log(`Reprocessing raw crawl artifact from S3 for site: ${siteId}, key: ${reprocessKey}`);
      try {
        const getObj = await this.s3Client.send(
          new GetObjectCommand({
            Bucket: bucketName,
            Key: reprocessKey,
          })
        );
        const rawHtml = (await getObj.Body?.transformToString()) || '';
        
        // Simulating parsing of raw HTML on S3
        const titleMatch = rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : '';

        const metaDescMatch = rawHtml.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || 
                              rawHtml.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
        const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : '';

        const robotsMatch = rawHtml.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i) ||
                             rawHtml.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']robots["']/i);
        const robotsMeta = robotsMatch ? robotsMatch[1].trim() : '';

        const canonicalMatch = rawHtml.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i) ||
                               rawHtml.match(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i);
        const canonicalUrl = canonicalMatch ? canonicalMatch[1].trim() : '';

        // Clean HTML tags to count words
        const textOnly = rawHtml.replace(/<[^>]+>/g, ' ');
        const wordCount = textOnly.trim().split(/\s+/).filter(Boolean).length;

        const storedStatusCode = getObj.Metadata?.statuscode || getObj.Metadata?.statusCode;
        const statusCode = storedStatusCode ? parseInt(storedStatusCode, 10) : 200;

        crawlResult = {
          success: true,
          statusCode,
          title,
          metaDescription,
          robotsMeta,
          canonicalUrl,
          wordCount,
          rawHtml,
          loadTimeMs: 0,
        };
      } catch (err: any) {
        console.error(`S3 retrieval failed for reprocessing:`, err.message);
        throw retryableJobError('storage_failure', `Failed to retrieve raw S3 content for reprocessing: ${err.message}`);
      }
    } else {
      console.log(`Processing crawl job ${job.id} for site: ${siteId}`);
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
                  redirect_chain: [],
                  redirect_status_codes: [],
                  robots_meta: '',
                  job_run_id: '',
                  observed_at: timestampStr,
                  ingested_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
                  schema_version: 'v1',
                  algorithm_version: 'v1.2.0-baseline',
                  source_origin: 'crawler',
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
                  redirect_chain: [],
                  redirect_status_codes: [],
                  robots_meta: '',
                  job_run_id: '',
                  observed_at: timestampStr,
                  ingested_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
                  schema_version: 'v1',
                  algorithm_version: 'v1.2.0-baseline',
                  source_origin: 'crawler',
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
    }

    console.log(`Successfully crawled ${url}. Status: ${crawlResult.statusCode}, wordCount: ${crawlResult.wordCount}`);

    // Acquire the durable fence before any raw or normalized writes so a replay
    // cannot overwrite an immutable artifact or duplicate historical facts.
    const shouldWriteObservation = await this.acquireIngestionFence(job);
    if (!shouldWriteObservation) {
      console.log(`Crawl ingestion already completed for key ${job.data.ingestionKey || job.data.idempotencyKey}.`);
      return;
    }

    // Fetch the actual jobRun.id for metadata tracking
    let jobRunId = '';
    try {
      const jobRun = await db.select({ id: jobRuns.id })
        .from(jobRuns)
        .where(and(
          eq(jobRuns.workspaceId, workspaceId),
          eq(jobRuns.idempotencyKey, job.data.idempotencyKey)
        ))
        .limit(1);
      jobRunId = jobRun[0]?.id || '';
    } catch (err) {
      console.warn(`Could not resolve jobRun.id in crawl processor: ${err.message}`);
    }

    // 2. Store an immutable raw artifact before normalizing it into ClickHouse.
    // The run-scoped key preserves historical evidence; the legacy latest key only
    // supports detectors that have not yet been migrated to artifact references.
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
            url: url,
            crawledAt: new Date().toISOString(),
            jobRunId: jobRunId,
            statusCode: String(crawlResult.statusCode || 200),
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
            redirect_chain: crawlResult.redirectChain || [],
            redirect_status_codes: crawlResult.redirectStatusCodes || [],
            robots_meta: crawlResult.robotsMeta || '',
            job_run_id: jobRunId,
            observed_at: timestampStr,
            ingested_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
            schema_version: 'v1',
            algorithm_version: reprocessKey ? 'v1.3.0-reprocessor' : 'v1.2.0-baseline',
            source_origin: reprocessKey ? 'reprocess' : 'crawler',
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

    // Phase 2: Run sitemap crawling, remote rendering, pagespeed analysis
    try {
      const siteDomain = siteResult[0].domain;
      const isHomepage = url === `http://${siteDomain}` || url === `https://${siteDomain}` || url === `http://${siteDomain}/` || url === `https://${siteDomain}/`;

      if (!job.data.isSitemapCrawl && isHomepage) {
        await this.runSitemapCrawling(siteDomain, siteId, workspaceId, jobRunId, ingestionKey, timestampStr, clickhouseDb, job);
      }

      await this.runRemoteRendering(
        url,
        workspaceId,
        siteId,
        ingestionKey,
        jobRunId,
        crawlResult.title || '',
        crawlResult.wordCount || 0,
        timestampStr,
        clickhouseDb,
        bucketName
      );

      await this.runPageSpeedAnalysis(url, siteId, jobRunId, timestampStr, clickhouseDb);
    } catch (phase2Err: any) {
      console.error(`Phase 2 crawlers/analyses caught error:`, phase2Err.message);
    }
  }

  private async runSitemapCrawling(
    siteDomain: string,
    siteId: string,
    workspaceId: string,
    jobRunId: string,
    ingestionKey: string,
    timestampStr: string,
    clickhouseDb: string,
    job: Job<CrawlJobData>
  ) {
    let sitemapUrls: string[] = [];
    const crawlerApiUrl = this.crawlerApiUrl.replace('/crawl', '/sitemap');

    for (const proto of ['https', 'http']) {
      try {
        const u = `${proto}://${siteDomain}/sitemap.xml`;
        console.log(`Checking sitemap at: ${u}`);
        const sitemapResp = await axios.post(
          crawlerApiUrl,
          { url: u },
          { timeout: 10000 }
        );
        if (sitemapResp.data?.success && Array.isArray(sitemapResp.data.urls)) {
          sitemapUrls = sitemapResp.data.urls;
          console.log(`Found ${sitemapUrls.length} URLs from sitemap ${u}`);

          if (sitemapUrls.length > 0) {
            await clickhouse.insert({
              table: `${clickhouseDb}.sitemap_observations`,
              values: sitemapUrls.map(crawledUrl => ({
                timestamp: timestampStr,
                site_id: siteId,
                sitemap_url: u,
                crawled_url: crawledUrl,
                job_run_id: jobRunId,
                observed_at: timestampStr,
              })),
              format: 'JSONEachRow',
            });
            console.log(`Inserted sitemap observations into ClickHouse.`);
          }
          break;
        }
      } catch (err: any) {
        console.warn(`Sitemap crawl failed for protocol ${proto}:`, err.message);
      }
    }

    if (sitemapUrls.length > 0 && this.crawlerQueue) {
      const maxPages = 49;
      const urlsToQueue = sitemapUrls.slice(0, maxPages).filter(u => u !== `http://${siteDomain}` && u !== `https://${siteDomain}`);
      console.log(`Enqueuing ${urlsToQueue.length} sitemap subpage URLs for crawling...`);
      for (const targetSubUrl of urlsToQueue) {
        const uniqueJobId = `${siteId}-${crypto.createHash('sha256').update(targetSubUrl).digest('hex')}-${ingestionKey}`;
        try {
          await this.crawlerQueue.add(
            'crawl.requested',
            {
              ...job.data,
              targetUrl: targetSubUrl,
              isSitemapCrawl: true,
            },
            {
              jobId: uniqueJobId,
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 2000,
              },
              removeOnComplete: true,
              removeOnFail: true,
            }
          );
        } catch (addErr: any) {
          console.warn(`Failed to enqueue subpage ${targetSubUrl}:`, addErr.message);
        }
      }
    }
  }

  private async runRemoteRendering(
    url: string,
    workspaceId: string,
    siteId: string,
    ingestionKey: string,
    jobRunId: string,
    rawTitle: string,
    rawWordCount: number,
    timestampStr: string,
    clickhouseDb: string,
    bucketName: string
  ) {
    let browser;
    try {
      console.log(`Starting headless Chromium render for: ${url}`);
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      const consoleErrors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      const renderedHtml = await page.content();
      const screenshotBuffer = await page.screenshot({ fullPage: true });

      const urlHash = crypto.createHash('sha256').update(url).digest('hex');
      const screenshotKey = `raw/screenshots/${workspaceId}/${siteId}/${ingestionKey}/${urlHash}.png`;

      try {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: screenshotKey,
            Body: screenshotBuffer,
            ContentType: 'image/png',
            Metadata: {
              workspace_id: workspaceId,
              site_id: siteId,
              url: url,
            }
          })
        );
        console.log(`Uploaded rendering screenshot to S3: ${screenshotKey}`);
      } catch (s3Err: any) {
        console.error(`Failed to upload screenshot to S3:`, s3Err.message);
      }

      const renderedTitle = await page.title();
      const titleMismatch = (rawTitle && renderedTitle && rawTitle.trim() !== renderedTitle.trim()) ? 1 : 0;

      let textParityPercent = 100.0;
      try {
        const renderedText = await page.innerText('body');
        const renderedWordCount = renderedText.trim().split(/\s+/).filter(Boolean).length;
        const wordDiff = Math.abs(rawWordCount - renderedWordCount);
        const maxWord = Math.max(rawWordCount, renderedWordCount, 1);
        textParityPercent = 100.0 - (wordDiff / maxWord) * 100.0;
      } catch (parityErr: any) {
        console.warn(`Text parity extraction failed:`, parityErr.message);
      }

      await clickhouse.insert({
        table: `${clickhouseDb}.render_observations`,
        values: [
          {
            timestamp: timestampStr,
            site_id: siteId,
            url,
            dynamic_html_length: renderedHtml.length,
            console_errors: consoleErrors.slice(0, 10),
            screenshot_s3_key: screenshotKey,
            title_mismatch: titleMismatch,
            text_parity_percent: textParityPercent,
            job_run_id: jobRunId,
            observed_at: timestampStr,
          }
        ],
        format: 'JSONEachRow',
      });
      console.log(`Recorded successful render observation to ClickHouse for: ${url}`);
    } catch (err: any) {
      console.error(`Chromium remote rendering failed for ${url}:`, err.message);
      await clickhouse.insert({
        table: `${clickhouseDb}.render_observations`,
        values: [
          {
            timestamp: timestampStr,
            site_id: siteId,
            url,
            dynamic_html_length: 0,
            console_errors: [`Browser crashed or page timeout: ${err.message}`],
            screenshot_s3_key: '',
            title_mismatch: 0,
            text_parity_percent: 0,
            job_run_id: jobRunId,
            observed_at: timestampStr,
          }
        ],
        format: 'JSONEachRow',
      });
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private async runPageSpeedAnalysis(
    url: string,
    siteId: string,
    jobRunId: string,
    timestampStr: string,
    clickhouseDb: string
  ) {
    const apiKey = process.env.PAGESPEED_API_KEY;
    if (!apiKey) {
      console.warn(`PAGESPEED_API_KEY is not defined. PageSpeed Insights analysis skipped.`);
      return;
    }

    try {
      console.log(`Calling PageSpeed Insights API for page: ${url}`);
      const targetUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&key=${apiKey}`;
      const res = await axios.get(targetUrl, { timeout: 45000 });
      const data = res.data;
      const lighthouse = data.lighthouseResult;
      const audits = lighthouse?.audits;

      const fcp = audits?.['first-contentful-paint']?.numericValue || 0;
      const lcp = audits?.['largest-contentful-paint']?.numericValue || 0;
      const cls = audits?.['cumulative-layout-shift']?.numericValue || 0;
      const fid = audits?.['max-potential-fid']?.numericValue || 0;
      const inp = audits?.['interaction-to-next-paint']?.numericValue || 0;

      const perfScore = (lighthouse?.categories?.['performance']?.score || 0) * 100;
      const accessScore = (lighthouse?.categories?.['accessibility']?.score || 0) * 100;
      const bestScore = (lighthouse?.categories?.['best-practices']?.score || 0) * 100;
      const seoScore = (lighthouse?.categories?.['seo']?.score || 0) * 100;

      await clickhouse.insert({
        table: `${clickhouseDb}.pagespeed_observations`,
        values: [
          {
            timestamp: timestampStr,
            site_id: siteId,
            url,
            device: 'mobile',
            fcp_ms: Math.round(fcp),
            lcp_ms: Math.round(lcp),
            cls: cls,
            fid_ms: Math.round(fid),
            inp_ms: Math.round(inp),
            performance_score: perfScore,
            accessibility_score: accessScore,
            best_practices_score: bestScore,
            seo_score: seoScore,
            job_run_id: jobRunId,
            observed_at: timestampStr,
          }
        ],
        format: 'JSONEachRow',
      });
      console.log(`Google PageSpeed observation inserted to ClickHouse.`);
    } catch (err: any) {
      console.error(`PageSpeed Insights API request failed:`, err.message);
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
