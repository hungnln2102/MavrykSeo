import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Queue } from "bullmq";
import { and, desc, eq } from "drizzle-orm";
import { createJobEnvelope, GscSyncJobData } from "@seo/core";
import { db, gscSyncStates, jobRuns } from "@seo/db";
import { IntegrationsService } from "./integrations.service";

interface GscCredentialSelection {
  siteUrl?: string;
}

@Injectable()
export class GscSyncService {
  private readonly queue = new Queue("gsc-queue", {
    connection: {
      host: process.env.REDIS_HOST || "localhost",
      port: Number(process.env.REDIS_PORT || 6379),
    },
  });

  constructor(private readonly integrationsService: IntegrationsService) {}

  async requestSync(
    workspaceId: string,
    projectId: string,
    input: { startDate?: string; endDate?: string },
  ) {
    const integration = await this.integrationsService.getIntegration(
      workspaceId,
      projectId,
      "google_search_console",
    );
    if (integration.status !== "active") {
      throw new BadRequestException(
        "Google Search Console must be reconnected before syncing",
      );
    }
    const credentials =
      (await this.integrationsService.getIntegrationCredentials(
        workspaceId,
        projectId,
        "google_search_console",
      )) as GscCredentialSelection;
    if (!credentials.siteUrl) {
      throw new BadRequestException(
        "A Google Search Console property must be selected before syncing",
      );
    }

    const endDate =
      input.endDate ||
      new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const startDate =
      input.startDate ||
      new Date(Date.now() - 31 * 86_400_000).toISOString().slice(0, 10);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(endDate) ||
      startDate > endDate
    ) {
      throw new BadRequestException(
        "GSC sync requires a valid ISO startDate and endDate",
      );
    }

    const envelope = createJobEnvelope("gsc.sync.requested", [
      workspaceId,
      projectId,
      credentials.siteUrl,
      startDate,
      endDate,
    ]);
    const payload: GscSyncJobData = {
      ...envelope,
      workspaceId,
      projectId,
      siteUrl: credentials.siteUrl,
      startDate,
      endDate,
      ingestionKey: envelope.idempotencyKey,
    };
    const [created] = await db
      .insert(jobRuns)
      .values({
        workspaceId,
        projectId,
        queueName: "gsc-queue",
        jobName: "gsc.sync.requested",
        bullmqJobId: envelope.idempotencyKey,
        idempotencyKey: envelope.idempotencyKey,
        correlationId: envelope.correlationId,
        state: "queued",
        attemptCount: 0,
        maxAttempts: 3,
        ingestionKey: envelope.idempotencyKey,
        payload,
      })
      .onConflictDoNothing()
      .returning({ id: jobRuns.id });

    if (!created) {
      return {
        queued: false,
        idempotencyKey: envelope.idempotencyKey,
        duplicate: true,
      };
    }

    await db
      .insert(gscSyncStates)
      .values({
        workspaceId,
        projectId,
        state: "queued",
        lastSyncStartDate: startDate,
        lastSyncEndDate: endDate,
        lastErrorCode: null,
        lastErrorMessage: null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: gscSyncStates.projectId,
        set: {
          state: "queued",
          lastSyncStartDate: startDate,
          lastSyncEndDate: endDate,
          lastErrorCode: null,
          lastErrorMessage: null,
          updatedAt: new Date(),
        },
      });

    await this.queue.add("gsc.sync.requested", payload, {
      jobId: envelope.idempotencyKey,
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
    return {
      queued: true,
      idempotencyKey: envelope.idempotencyKey,
      duplicate: false,
    };
  }

  async getStatus(workspaceId: string, projectId: string) {
    const [status] = await db
      .select()
      .from(gscSyncStates)
      .where(
        and(
          eq(gscSyncStates.workspaceId, workspaceId),
          eq(gscSyncStates.projectId, projectId),
        ),
      )
      .limit(1);
    let connectionStatus = "not_connected";
    try {
      connectionStatus = (
        await this.integrationsService.getIntegration(
          workspaceId,
          projectId,
          "google_search_console",
        )
      ).status;
    } catch (error) {
      if (!(error instanceof NotFoundException)) throw error;
    }
    const [latestJob] = await db
      .select()
      .from(jobRuns)
      .where(
        and(
          eq(jobRuns.workspaceId, workspaceId),
          eq(jobRuns.projectId, projectId),
          eq(jobRuns.queueName, "gsc-queue"),
        ),
      )
      .orderBy(desc(jobRuns.createdAt))
      .limit(1);
    const staleAfterSeconds = this.getStaleAfterSeconds();
    const lastSuccessfulSyncAt = status?.lastSuccessfulSyncAt || null;
    const freshnessSeconds = lastSuccessfulSyncAt
      ? Math.max(
          0,
          Math.floor((Date.now() - lastSuccessfulSyncAt.getTime()) / 1000),
        )
      : null;
    return {
      connectionStatus,
      state: status?.state || "not_synced",
      lastSuccessfulSyncAt,
      lastSyncStartedAt: status?.lastSyncStartedAt || null,
      lastSyncStartDate: status?.lastSyncStartDate || null,
      lastSyncEndDate: status?.lastSyncEndDate || null,
      retryCount: status?.retryCount || 0,
      lastErrorCode: status?.lastErrorCode || null,
      lastErrorMessage: status?.lastErrorMessage || null,
      freshness: {
        ageSeconds: freshnessSeconds,
        staleAfterSeconds,
        isStale:
          connectionStatus === "active" &&
          (freshnessSeconds === null || freshnessSeconds > staleAfterSeconds),
      },
      latestJob: latestJob
        ? {
            id: latestJob.id,
            state: latestJob.state,
            errorCode: latestJob.errorCode,
            createdAt: latestJob.createdAt,
            completedAt: latestJob.completedAt,
          }
        : null,
    };
  }

  private getStaleAfterSeconds() {
    const configured = Number(process.env.GSC_STALE_AFTER_SECONDS);
    return Number.isInteger(configured) && configured > 0 ? configured : 172800;
  }
}
