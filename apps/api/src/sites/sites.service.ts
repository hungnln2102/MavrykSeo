import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { db, jobRuns, sites, projects, workspaces } from '@seo/db';
import { eq, and, count, inArray, desc } from 'drizzle-orm';
import { Queue } from 'bullmq';
import { createJobEnvelope, CrawlJobData } from '@seo/core';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import * as crypto from 'crypto';

@Injectable()
export class SitesService {
  private queue: Queue;
  private s3Client: S3Client;

  constructor() {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    this.queue = new Queue('crawler-queue', {
      connection: {
        host: redisHost,
        port: redisPort,
      },
    });

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

  private async verifyProjectBelongsToWorkspace(workspaceId: string, projectId: string) {
    const projectResult = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.workspaceId, workspaceId)
        )
      )
      .limit(1);

    if (projectResult.length === 0) {
      throw new NotFoundException('Project not found in this workspace');
    }
  }

  private isCrawlKillSwitchEnabled(): boolean {
    return process.env.CRAWL_KILL_SWITCH?.trim().toLowerCase() === 'true';
  }

  private async assertCrawlCanBeDispatched(workspaceId: string, projectId: string) {
    if (this.isCrawlKillSwitchEnabled()) {
      throw new ForbiddenException('Crawling is temporarily disabled by an operator');
    }

    const [workspace] = await db
      .select({
        crawlEnabled: workspaces.crawlEnabled,
        crawlMaxConcurrentJobs: workspaces.crawlMaxConcurrentJobs,
      })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    const [project] = await db
      .select({
        crawlEnabled: projects.crawlEnabled,
        crawlMaxConcurrentJobs: projects.crawlMaxConcurrentJobs,
      })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (!workspace || !project) {
      throw new NotFoundException('Crawl configuration not found in this workspace');
    }

    if (!workspace.crawlEnabled || !project.crawlEnabled) {
      throw new ForbiddenException('Crawling is disabled for this workspace or project');
    }

    const maxConcurrentJobs = project.crawlMaxConcurrentJobs === null
      ? workspace.crawlMaxConcurrentJobs
      : Math.min(workspace.crawlMaxConcurrentJobs, project.crawlMaxConcurrentJobs);
    const [activeJobs] = await db
      .select({ value: count() })
      .from(jobRuns)
      .where(and(
        eq(jobRuns.workspaceId, workspaceId),
        eq(jobRuns.projectId, projectId),
        eq(jobRuns.queueName, 'crawler-queue'),
        inArray(jobRuns.state, ['queued', 'active']),
      ));

    if ((activeJobs?.value || 0) >= maxConcurrentJobs) {
      throw new BadRequestException('Crawl concurrency limit reached for this workspace or project');
    }
  }

  async createSite(workspaceId: string, projectId: string, domain: string) {
    // 1. Verify project-workspace match
    await this.verifyProjectBelongsToWorkspace(workspaceId, projectId);

    // 2. Fetch workspace plan
    const workspaceResult = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (workspaceResult.length === 0) {
      throw new NotFoundException('Workspace not found');
    }

    const plan = workspaceResult[0].plan || 'free';

    // 3. Count current sites in the workspace
    const countResult = await db
      .select({ value: count() })
      .from(sites)
      .innerJoin(projects, eq(sites.projectId, projects.id))
      .where(eq(projects.workspaceId, workspaceId));

    const currentCount = countResult[0]?.value || 0;

    // 4. Validate quota
    let maxSites = 1;
    if (plan === 'pro') {
      maxSites = 10;
    } else if (plan === 'enterprise') {
      maxSites = 9999;
    }

    if (currentCount >= maxSites) {
      throw new BadRequestException(`Site limit reached for workspace plan '${plan}'. Upgrade required.`);
    }

    // 5. Insert site
    const [newSite] = await db.insert(sites).values({
      projectId,
      domain,
    }).returning();

    return newSite;
  }

  async getSites(workspaceId: string, projectId: string) {
    // 1. Verify project-workspace match
    await this.verifyProjectBelongsToWorkspace(workspaceId, projectId);

    // 2. Query sites
    const results = await db
      .select()
      .from(sites)
      .where(eq(sites.projectId, projectId));

    return results;
  }

  async triggerCrawl(workspaceId: string, siteId: string) {
    return this.triggerCrawlForRun(workspaceId, siteId, `manual-${Math.floor(Date.now() / (5 * 60 * 1000))}`);
  }

  async triggerScheduledCrawl(workspaceId: string, siteId: string, scheduledFor: Date) {
    return this.triggerCrawlForRun(workspaceId, siteId, `scheduled-${scheduledFor.toISOString()}`);
  }

  async updateCrawlSchedule(workspaceId: string, siteId: string, crawlScheduleMinutes: number | null) {
    const siteResult = await db
      .select({ id: sites.id })
      .from(sites)
      .innerJoin(projects, eq(sites.projectId, projects.id))
      .where(and(eq(sites.id, siteId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (siteResult.length === 0) {
      throw new NotFoundException('Site not found in this workspace');
    }

    const [updatedSite] = await db.update(sites).set({
      crawlScheduleMinutes,
      updatedAt: new Date(),
    }).where(eq(sites.id, siteId)).returning();

    return updatedSite;
  }

  private async triggerCrawlForRun(workspaceId: string, siteId: string, runKey: string) {
    // 1. Fetch site and verify it belongs to workspace
    const siteResult = await db
      .select({
        id: sites.id,
        domain: sites.domain,
        projectId: sites.projectId,
      })
      .from(sites)
      .innerJoin(projects, eq(sites.projectId, projects.id))
      .where(
        and(
          eq(sites.id, siteId),
          eq(projects.workspaceId, workspaceId)
        )
      )
      .limit(1);

    if (siteResult.length === 0) {
      throw new NotFoundException('Site not found in this workspace');
    }

    const site = siteResult[0];

    await this.assertCrawlCanBeDispatched(workspaceId, site.projectId);

    // 2. Enqueue crawl job in BullMQ crawler-queue
    const envelope = createJobEnvelope('crawl.requested', [workspaceId, site.id, runKey]);
    const jobData: CrawlJobData = {
      ...envelope,
      workspaceId,
      siteId: site.id,
      ingestionKey: envelope.idempotencyKey,
    };
    let jobRunRecorded = false;

    try {
      const [createdJobRun] = await db.insert(jobRuns).values({
        workspaceId,
        projectId: site.projectId,
        queueName: 'crawler-queue',
        jobName: 'crawl.requested',
        bullmqJobId: envelope.idempotencyKey,
        idempotencyKey: envelope.idempotencyKey,
        correlationId: envelope.correlationId,
        state: 'queued',
        attemptCount: 0,
        maxAttempts: 3,
        ingestionKey: envelope.idempotencyKey,
        payload: jobData,
      }).onConflictDoNothing().returning({ id: jobRuns.id });
      jobRunRecorded = true;

      if (!createdJobRun) {
        return { success: true, siteId: site.id, message: 'Crawl run already exists for this execution window' };
      }

      await this.queue.add('crawl.requested', jobData, {
        jobId: envelope.idempotencyKey,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      });
    } catch (err) {
      if (jobRunRecorded) {
        await db.update(jobRuns).set({
          state: 'failed',
          errorCode: 'queue_dispatch_failed',
          errorMessage: 'Unable to dispatch crawl job to the queue',
          failedAt: new Date(),
          updatedAt: new Date(),
        }).where(and(eq(jobRuns.workspaceId, workspaceId), eq(jobRuns.idempotencyKey, envelope.idempotencyKey)));
      }
      throw new BadRequestException(`Failed to enqueue crawl job: ${err.message}`);
    }

    return { success: true, siteId: site.id, message: 'Crawl job enqueued successfully' };
  }

  async getSiteCrawls(workspaceId: string, siteId: string) {
    // 1. Fetch site and verify it belongs to workspace
    const siteResult = await db
      .select({ projectId: sites.projectId })
      .from(sites)
      .innerJoin(projects, eq(sites.projectId, projects.id))
      .where(and(eq(sites.id, siteId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (siteResult.length === 0) {
      throw new NotFoundException('Site not found in this workspace');
    }

    const { projectId } = siteResult[0];

    // 2. Query jobRuns for crawler-queue and the projectId
    const runs = await db
      .select()
      .from(jobRuns)
      .where(and(
        eq(jobRuns.workspaceId, workspaceId),
        eq(jobRuns.projectId, projectId),
        eq(jobRuns.queueName, 'crawler-queue')
      ))
      .orderBy(desc(jobRuns.createdAt))
      .limit(50);

    return runs;
  }

  async getCrawlRawHtml(workspaceId: string, siteId: string, jobRunId: string): Promise<string> {
    // 1. Fetch site and verify it belongs to workspace
    const siteResult = await db
      .select({ projectId: sites.projectId })
      .from(sites)
      .innerJoin(projects, eq(sites.projectId, projects.id))
      .where(and(eq(sites.id, siteId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (siteResult.length === 0) {
      throw new NotFoundException('Site not found in this workspace');
    }

    // 2. Fetch the job run record to get the ingestionKey
    const runResult = await db
      .select({ ingestionKey: jobRuns.ingestionKey })
      .from(jobRuns)
      .where(and(
        eq(jobRuns.id, jobRunId),
        eq(jobRuns.workspaceId, workspaceId)
      ))
      .limit(1);

    if (runResult.length === 0) {
      throw new NotFoundException('Crawl job run not found');
    }

    const ingestionKey = runResult[0].ingestionKey;
    if (!ingestionKey) {
      throw new NotFoundException('Crawl job run has no ingestion key');
    }

    const bucketName = process.env.S3_BUCKET || process.env.S3_BUCKET_NAME || 'seo-platform-raw';
    const rawArtifactKey = `raw/crawl/${workspaceId}/${siteId}/${ingestionKey}/index.html`;

    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: rawArtifactKey,
        })
      );

      const rawHtml = await response.Body?.transformToString() || '';
      return rawHtml;
    } catch (err) {
      throw new NotFoundException(`Failed to retrieve raw HTML from storage: ${err.message}`);
    }
  }

  async compareCrawls(
    workspaceId: string,
    siteId: string,
    baseJobRunId: string,
    compareJobRunId: string,
    urlStr?: string
  ) {
    const siteResult = await db
      .select({ projectId: sites.projectId, domain: sites.domain })
      .from(sites)
      .innerJoin(projects, eq(sites.projectId, projects.id))
      .where(and(eq(sites.id, siteId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (siteResult.length === 0) {
      throw new NotFoundException('Site not found in this workspace');
    }

    const site = siteResult[0];

    const baseRunResult = await db
      .select({ ingestionKey: jobRuns.ingestionKey })
      .from(jobRuns)
      .where(and(eq(jobRuns.id, baseJobRunId), eq(jobRuns.workspaceId, workspaceId)))
      .limit(1);

    if (baseRunResult.length === 0) {
      throw new NotFoundException('Base crawl job run not found');
    }

    const compareRunResult = await db
      .select({ ingestionKey: jobRuns.ingestionKey })
      .from(jobRuns)
      .where(and(eq(jobRuns.id, compareJobRunId), eq(jobRuns.workspaceId, workspaceId)))
      .limit(1);

    if (compareRunResult.length === 0) {
      throw new NotFoundException('Compare crawl job run not found');
    }

    const baseIngestionKey = baseRunResult[0].ingestionKey;
    const compareIngestionKey = compareRunResult[0].ingestionKey;

    if (!baseIngestionKey || !compareIngestionKey) {
      throw new BadRequestException('Crawls are not in a comparable state (missing ingestion keys)');
    }

    let targetUrl = urlStr;
    if (!targetUrl) {
      targetUrl = `https://${site.domain}/`;
    }

    const urlHash = crypto.createHash('sha256').update(targetUrl).digest('hex');
    const bucketName = process.env.S3_BUCKET || process.env.S3_BUCKET_NAME || 'seo-platform-raw';

    const baseKey = `raw/crawl/${workspaceId}/${siteId}/${baseIngestionKey}/${urlHash}.html`;
    const compareKey = `raw/crawl/${workspaceId}/${siteId}/${compareIngestionKey}/${urlHash}.html`;

    let baseHtml = '';
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: baseKey,
        })
      );
      baseHtml = await response.Body?.transformToString() || '';
    } catch {
      // Keep empty if not found
    }

    let compareHtml = '';
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: compareKey,
        })
      );
      compareHtml = await response.Body?.transformToString() || '';
    } catch {
      // Keep empty if not found
    }

    return {
      url: targetUrl,
      baseJobRunId,
      compareJobRunId,
      baseHtml,
      compareHtml,
    };
  }
}
