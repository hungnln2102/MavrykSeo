import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Queue } from "bullmq";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  createJobEnvelope,
  isValidCrawlJobData,
  isValidGscSyncJobData,
  isValidRankJobData,
} from "@seo/core";
import { db, jobRuns } from "@seo/db";

const QUEUE_OPTIONS = {
  backoff: { type: "exponential" as const, delay: 1000 },
  removeOnComplete: 1000,
  removeOnFail: 5000,
};

interface ReplayablePayload {
  workspaceId: string;
  projectId?: string;
  siteId?: string;
  query?: string;
  numResults?: number;
  siteUrl?: string;
  startDate?: string;
  endDate?: string;
  ingestionKey?: string;
}

@Injectable()
export class JobsService {
  private readonly queues: Record<string, Queue>;

  constructor() {
    const redisHost = process.env.REDIS_HOST || "localhost";
    const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);
    const connection = { host: redisHost, port: redisPort };

    this.queues = {
      "crawler-queue": new Queue("crawler-queue", { connection }),
      "collector-queue": new Queue("collector-queue", { connection }),
      "gsc-queue": new Queue("gsc-queue", { connection }),
    };
  }

  async getFailedJobs(workspaceId: string) {
    const deadLetteredRuns = await db
      .select()
      .from(jobRuns)
      .where(
        and(
          eq(jobRuns.workspaceId, workspaceId),
          eq(jobRuns.state, "dead_lettered"),
        ),
      );

    return deadLetteredRuns.map((jobRun) => this.toSafeJobRun(jobRun));
  }

  async replayFailedJob(workspaceId: string, jobRunId: string) {
    const result = await db
      .select()
      .from(jobRuns)
      .where(
        and(
          eq(jobRuns.id, jobRunId),
          eq(jobRuns.workspaceId, workspaceId),
          eq(jobRuns.state, "dead_lettered"),
        ),
      )
      .limit(1);

    if (result.length === 0) {
      throw new NotFoundException("Failed job not found in this workspace");
    }

    const failedRun = result[0];
    const queue = this.queues[failedRun.queueName];
    if (
      !queue ||
      !this.isSupportedJob(failedRun.queueName, failedRun.jobName)
    ) {
      throw new BadRequestException("This job type cannot be replayed");
    }

    const payload = failedRun.payload as ReplayablePayload;
    if (!payload || payload.workspaceId !== workspaceId) {
      throw new BadRequestException("Stored job payload is invalid for replay");
    }

    const envelope = createJobEnvelope(failedRun.jobName, [
      workspaceId,
      failedRun.id,
      randomUUID(),
    ]);
    const replayPayload = {
      ...payload,
      ...envelope,
      replayOfJobRunId: failedRun.id,
      ingestionKey:
        failedRun.queueName === "gsc-queue"
          ? envelope.idempotencyKey
          : failedRun.ingestionKey,
    };

    if (!this.isValidReplayPayload(failedRun.queueName, replayPayload)) {
      throw new BadRequestException("Stored job payload is invalid for replay");
    }

    let replayRecorded = false;
    try {
      await db.insert(jobRuns).values({
        workspaceId,
        projectId: failedRun.projectId,
        queueName: failedRun.queueName,
        jobName: failedRun.jobName,
        bullmqJobId: envelope.idempotencyKey,
        idempotencyKey: envelope.idempotencyKey,
        correlationId: envelope.correlationId,
        state: "queued",
        attemptCount: 0,
        maxAttempts: failedRun.maxAttempts,
        replayOfJobRunId: failedRun.id,
        ingestionKey: failedRun.ingestionKey,
        payload: replayPayload,
      });
      replayRecorded = true;

      await queue.add(failedRun.jobName, replayPayload, {
        jobId: envelope.idempotencyKey,
        attempts: failedRun.maxAttempts,
        ...QUEUE_OPTIONS,
      });
    } catch (error) {
      if (replayRecorded) {
        await db
          .update(jobRuns)
          .set({
            state: "dead_lettered",
            errorCode: "queue_dispatch_failed",
            errorMessage: "Unable to dispatch replay job to the queue",
            failedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(jobRuns.workspaceId, workspaceId),
              eq(jobRuns.idempotencyKey, envelope.idempotencyKey),
            ),
          );
      }

      throw new BadRequestException("Failed to replay job");
    }

    return {
      replayedFromJobRunId: failedRun.id,
      job: {
        jobName: failedRun.jobName,
        queueName: failedRun.queueName,
        correlationId: envelope.correlationId,
        idempotencyKey: envelope.idempotencyKey,
        state: "queued",
      },
    };
  }

  async reprocessJob(workspaceId: string, jobRunId: string) {
    const result = await db
      .select()
      .from(jobRuns)
      .where(
        and(
          eq(jobRuns.id, jobRunId),
          eq(jobRuns.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    if (result.length === 0) {
      throw new NotFoundException("Job not found in this workspace");
    }

    const failedRun = result[0];
    const payload = failedRun.payload as ReplayablePayload;
    if (!payload || payload.workspaceId !== workspaceId) {
      throw new BadRequestException("Stored job payload is invalid for reprocessing");
    }

    const ingestionKey = failedRun.ingestionKey || failedRun.idempotencyKey;
    let reprocessRawArtifactKey = '';

    if (failedRun.queueName === 'crawler-queue') {
      const siteId = payload.siteId || (payload as any).siteId;
      if (!siteId) {
        throw new BadRequestException("Crawl job payload does not contain siteId");
      }
      reprocessRawArtifactKey = `raw/crawl/${workspaceId}/${siteId}/${ingestionKey}/index.html`;
    } else if (failedRun.queueName === 'collector-queue') {
      const projectId = failedRun.projectId || payload.projectId;
      if (!projectId) {
        throw new BadRequestException("Serp job payload does not contain projectId");
      }
      reprocessRawArtifactKey = `raw/serp/${workspaceId}/${projectId}/${ingestionKey}.json`;
    } else {
      throw new BadRequestException("This job type cannot be reprocessed");
    }

    const queue = this.queues[failedRun.queueName];
    if (!queue) {
      throw new BadRequestException("Queue not initialized");
    }

    const envelope = createJobEnvelope(failedRun.jobName, [
      workspaceId,
      failedRun.id,
      randomUUID(),
      "reprocess",
    ]);

    const reprocessPayload = {
      ...payload,
      ...envelope,
      reprocessRawArtifactKey,
      replayOfJobRunId: failedRun.id,
      ingestionKey: `reprocess-${envelope.idempotencyKey}`,
    };

    let reprocessRecorded = false;
    try {
      await db.insert(jobRuns).values({
        workspaceId,
        projectId: failedRun.projectId,
        queueName: failedRun.queueName,
        jobName: failedRun.jobName,
        bullmqJobId: envelope.idempotencyKey,
        idempotencyKey: envelope.idempotencyKey,
        correlationId: envelope.correlationId,
        state: "queued",
        attemptCount: 0,
        maxAttempts: failedRun.maxAttempts,
        replayOfJobRunId: failedRun.id,
        ingestionKey: `reprocess-${envelope.idempotencyKey}`,
        payload: reprocessPayload,
      });
      reprocessRecorded = true;

      await queue.add(failedRun.jobName, reprocessPayload, {
        jobId: envelope.idempotencyKey,
        attempts: failedRun.maxAttempts,
        ...QUEUE_OPTIONS,
      });
    } catch (error) {
      if (reprocessRecorded) {
        await db
          .update(jobRuns)
          .set({
            state: "dead_lettered",
            errorCode: "queue_dispatch_failed",
            errorMessage: "Unable to dispatch reprocess job to the queue",
            failedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(jobRuns.workspaceId, workspaceId),
              eq(jobRuns.idempotencyKey, envelope.idempotencyKey),
            ),
          );
      }

      throw new BadRequestException("Failed to reprocess job");
    }

    return {
      reprocessedFromJobRunId: failedRun.id,
      job: {
        jobName: failedRun.jobName,
        queueName: failedRun.queueName,
        correlationId: envelope.correlationId,
        idempotencyKey: envelope.idempotencyKey,
        state: "queued",
      },
    };
  }


  private isSupportedJob(queueName: string, jobName: string) {
    return (
      (queueName === "crawler-queue" && jobName === "crawl.requested") ||
      (queueName === "collector-queue" &&
        (jobName === "rank.requested" || jobName === "serp.requested")) ||
      (queueName === "gsc-queue" && jobName === "gsc.sync.requested")
    );
  }

  private isValidReplayPayload(queueName: string, payload: ReplayablePayload) {
    if (queueName === "crawler-queue") return isValidCrawlJobData(payload);
    if (queueName === "collector-queue") return isValidRankJobData(payload);
    return isValidGscSyncJobData(payload);
  }

  private toSafeJobRun(jobRun: typeof jobRuns.$inferSelect) {
    return {
      id: jobRun.id,
      projectId: jobRun.projectId,
      queueName: jobRun.queueName,
      jobName: jobRun.jobName,
      correlationId: jobRun.correlationId,
      idempotencyKey: jobRun.idempotencyKey,
      state: jobRun.state,
      attemptCount: jobRun.attemptCount,
      maxAttempts: jobRun.maxAttempts,
      errorCode: jobRun.errorCode,
      errorMessage: jobRun.errorMessage,
      replayOfJobRunId: jobRun.replayOfJobRunId,
      createdAt: jobRun.createdAt,
      failedAt: jobRun.failedAt,
    };
  }
}
