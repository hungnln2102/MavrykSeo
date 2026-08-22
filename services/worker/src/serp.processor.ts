import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Worker, Job, UnrecoverableError } from 'bullmq';
import { clickhouse } from '@seo/clickhouse';
import { db, ingestionFences, jobRuns, projects } from '@seo/db';
import { and, eq } from 'drizzle-orm';
import axios from 'axios';
import { isRetryableJobError, isValidJobEnvelope, isValidRankJobData, JobProcessingError, nonRetryableJobError, retryableJobError, RankJobData } from '@seo/core';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { jobDeadLetterCounter, serpQueriesCounter, serpCostUsdCounter } from './metrics';

@Injectable()
export class SerpProcessor implements OnModuleInit, OnModuleDestroy {
  private worker: Worker;
  private s3Client: S3Client;
  private collectorApiUrl: string;

  constructor() {
    this.collectorApiUrl = process.env.COLLECTOR_API_URL || 'http://localhost:8082/collect/serp';
    
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

    console.log(`Starting BullMQ worker on queue 'collector-queue' (Redis: ${redisHost}:${redisPort})...`);

    this.worker = new Worker(
      'collector-queue',
      async (job: Job<RankJobData>) => {
        try {
          if (job.name === 'serp.requested' || job.name === 'rank.requested') {
            await this.markActive(job);
            await this.handleSerpJob(job);
          }
        } catch (error) {
          if (!isRetryableJobError(error)) {
            throw new UnrecoverableError(error instanceof Error ? error.message : 'Non-retryable SERP job failure');
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
      console.log(`Collector job ${job.id} completed successfully.`);
    });

    this.worker.on('failed', async (job, err) => {
      if (job && this.isFinalFailure(job, err)) {
        await this.markFailed(job, err);
      }
      console.error(`Collector job ${job?.id} failed with error:`, err);
    });
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
      console.log('BullMQ collector worker closed.');
    }
  }

  private async handleSerpJob(job: Job<RankJobData>) {
    const { workspaceId, projectId, query, numResults, device, country } = job.data;
    const bucketName = process.env.S3_BUCKET || process.env.S3_BUCKET_NAME || 'seo-platform-raw';

    if (!isValidRankJobData(job.data)) {
      throw nonRetryableJobError(
        'invalid_payload',
        'Invalid SERP job data: schema version, correlation ID, idempotency key, workspaceId, projectId, query, and ingestion key are required',
      );
    }

    const projectResult = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (projectResult.length === 0) {
      throw nonRetryableJobError('tenant_scope_violation', 'SERP job project does not belong to the requested workspace');
    }

    // 1. Invoke Go Collector Service or S3 Reprocessor
    let serpResult;
    const reprocessKey = job.data.reprocessRawArtifactKey;

    if (reprocessKey) {
      console.log(`Reprocessing raw SERP artifact from S3 for project: ${projectId}, key: ${reprocessKey}`);
      try {
        const getObj = await this.s3Client.send(
          new GetObjectCommand({
            Bucket: bucketName,
            Key: reprocessKey,
          })
        );
        const rawJsonString = (await getObj.Body?.transformToString()) || '{}';
        serpResult = JSON.parse(rawJsonString);
      } catch (err: any) {
        console.error(`S3 retrieval failed for SERP reprocessing:`, err.message);
        throw retryableJobError('storage_failure', `Failed to retrieve raw S3 SERP content for reprocessing: ${err.message}`);
      }
    } else {
      try {
        const response = await axios.post(this.collectorApiUrl, {
          query,
          numResults: numResults || 10,
          device: device || 'desktop',
          country: country || 'US',
        });
        serpResult = response.data;
      } catch (error: any) {
        console.error(`Go collector API request failed for query ${query}:`, error.message);
        const status = error.response?.status;
        if (status === 403) {
          throw nonRetryableJobError('provider_authentication_failed', `Provider authentication failed (status 403): ${error.message}`);
        } else if (status === 429) {
          throw retryableJobError('transient_provider_failure', `Provider rate limit exceeded (status 429): ${error.message}`);
        } else if (status === 503 || status === 500) {
          throw retryableJobError('transient_provider_failure', `Downstream provider failure (status ${status}): ${error.message}`);
        }
        throw error;
      }

      if (!serpResult.success) {
        const providerError = serpResult.error || 'Unknown';
        const statusCode = serpResult.status || 500;
        if (statusCode === 403 || providerError.toLowerCase().includes('key') || providerError.toLowerCase().includes('auth')) {
          throw nonRetryableJobError('provider_authentication_failed', `Go Collector returned auth failure: ${providerError}`);
        } else if (statusCode === 429) {
          throw retryableJobError('transient_provider_failure', `Go Collector returned rate limit: ${providerError}`);
        } else {
          throw new Error(`Go Collector returned failure: ${providerError}`);
        }
      }
    }

    console.log(`Successfully collected SERP for query '${query}'. Results count: ${serpResult.results?.length}`);

    // Update Prometheus metrics for queries and cost
    if (!reprocessKey) {
      serpQueriesCounter.inc({
        workspace_id: workspaceId,
        project_id: projectId,
        device: device || 'desktop',
        country: country || 'US',
      });
      serpCostUsdCounter.inc({
        workspace_id: workspaceId,
        project_id: projectId,
      }, 0.005); // each query costs $0.005
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
    } catch (err: any) {
      console.warn(`Could not resolve jobRun.id in serp processor: ${err.message}`);
    }

    // 2. Upload raw SERP JSON to S3
    const ingestionKey = job.data.ingestionKey || job.data.idempotencyKey;
    const rawArtifactKey = `raw/serp/${workspaceId}/${projectId}/${ingestionKey}.json`;

    if (!reprocessKey) {
      try {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: rawArtifactKey,
            Body: JSON.stringify(serpResult),
            ContentType: 'application/json',
            Metadata: {
              workspace_id: workspaceId,
              project_id: projectId,
              ingestion_key: ingestionKey,
              query: query,
              results_count: String(serpResult.results?.length || 0),
              collectedAt: new Date().toISOString(),
              device: device || 'desktop',
              country: country || 'US',
              jobRunId: jobRunId,
            },
          }),
        );
        console.log(`Stored raw SERP artifact for project ${projectId} with key ${rawArtifactKey}`);
      } catch (s3Error: any) {
        console.error(`Failed to store raw SERP artifact in S3:`, s3Error.message);
        throw retryableJobError('storage_failure', `Failed to upload raw SERP JSON to S3: ${s3Error.message}`);
      }
    }

    // 3. Insert rank observations to ClickHouse
    const clickhouseDb = process.env.CLICKHOUSE_DB || 'seo_platform';
    const timestampStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const observations = (serpResult.results || []).map((res: any) => {
      let competitorDomain = '';
      try {
        const parsedUrl = new URL(res.url);
        competitorDomain = parsedUrl.hostname.replace('www.', '');
      } catch (err) {
        competitorDomain = '';
      }

      // If it is our target domain, it is not a competitor
      if (competitorDomain === 'agency.mavryk.io') {
        competitorDomain = '';
      }

      return {
        timestamp: timestampStr,
        project_id: projectId,
        keyword: query,
        rank: res.position,
        search_volume: serpResult.searchVolume || 0,
        url: res.url,
        competitor_domain: competitorDomain,
        device: device || 'desktop',
        country: country || 'US',
        job_run_id: jobRunId,
        observed_at: timestampStr,
        ingested_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        schema_version: 'v1',
        algorithm_version: reprocessKey ? 'v1.2.0-reprocessor' : 'v1.1.0-serp',
        source_origin: reprocessKey ? 'reprocess' : 'serp',
      };
    });

    const shouldWriteObservations = await this.acquireIngestionFence(job);
    if (!shouldWriteObservations) {
      console.log(`SERP ingestion already completed for key ${ingestionKey}.`);
      return;
    }

    try {
      await clickhouse.insert({
        table: `${clickhouseDb}.rank_observations`,
        values: observations,
        format: 'JSONEachRow',
      });
      await this.completeIngestionFence(job);
      console.log(`Inserted ${observations.length} rank observations to ClickHouse for project: ${projectId}`);
    } catch (error: any) {
      console.error(`Failed to insert rank observations to ClickHouse:`, error.message);
      throw error;
    }
  }

  private async markActive(job: Job<RankJobData>) {
    if (!isValidJobEnvelope(job.data) || !job.data.workspaceId) return;

    await db.update(jobRuns).set({
      state: 'active',
      attemptCount: job.attemptsMade + 1,
      errorCode: null,
      errorMessage: null,
      updatedAt: new Date(),
    }).where(and(eq(jobRuns.workspaceId, job.data.workspaceId), eq(jobRuns.idempotencyKey, job.data.idempotencyKey)));
  }

  private async acquireIngestionFence(job: Job<RankJobData>) {
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
      'SERP ingestion fence is incomplete; operator reconciliation is required before another write',
    );
  }

  private async completeIngestionFence(job: Job<RankJobData>) {
    const ingestionKey = job.data.ingestionKey || job.data.idempotencyKey;
    await db.update(ingestionFences).set({
      state: 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
    }).where(and(eq(ingestionFences.workspaceId, job.data.workspaceId), eq(ingestionFences.ingestionKey, ingestionKey)));
    await this.markIngestionState(job, 'completed', { ingestionCompletedAt: new Date() });
  }

  private async markIngestionState(
    job: Job<RankJobData>,
    ingestionState: string,
    timestamps: { ingestionStartedAt?: Date; ingestionCompletedAt?: Date } = {},
  ) {
    await db.update(jobRuns).set({
      ingestionState,
      ...timestamps,
      updatedAt: new Date(),
    }).where(and(eq(jobRuns.workspaceId, job.data.workspaceId), eq(jobRuns.idempotencyKey, job.data.idempotencyKey)));
  }

  private async markCompleted(job: Job<RankJobData>) {
    if (!isValidJobEnvelope(job.data) || !job.data.workspaceId) return;

    await db.update(jobRuns).set({
      state: 'completed',
      completedAt: new Date(),
      errorCode: null,
      errorMessage: null,
      updatedAt: new Date(),
    }).where(and(eq(jobRuns.workspaceId, job.data.workspaceId), eq(jobRuns.idempotencyKey, job.data.idempotencyKey)));
  }

  private async markFailed(job: Job<RankJobData>, error: Error) {
    if (!isValidJobEnvelope(job.data) || !job.data.workspaceId) return;

    await db.update(jobRuns).set({
      state: 'dead_lettered',
      attemptCount: job.attemptsMade,
      errorCode: error instanceof JobProcessingError ? error.code : 'unexpected_failure',
      errorMessage: 'SERP job failed; inspect safe worker logs with the correlation ID',
      failedAt: new Date(),
      updatedAt: new Date(),
    }).where(and(eq(jobRuns.workspaceId, job.data.workspaceId), eq(jobRuns.idempotencyKey, job.data.idempotencyKey)));
    jobDeadLetterCounter.inc({
      queue: 'collector-queue',
      job_name: job.name,
      error_code: error instanceof JobProcessingError ? error.code : 'unexpected_failure',
    });
  }

  private isFinalFailure(job: Job<RankJobData>, error: Error) {
    return error instanceof UnrecoverableError || job.attemptsMade >= (job.opts.attempts || 1);
  }
}
