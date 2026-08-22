import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Job, UnrecoverableError, Worker } from "bullmq";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { and, eq } from "drizzle-orm";
import { clickhouse } from "@seo/clickhouse";
import {
  decryptToken,
  encryptToken,
  GscSyncJobData,
  isRetryableJobError,
  isValidGscSyncJobData,
  JobProcessingError,
  nonRetryableJobError,
} from "@seo/core";
import {
  db,
  gscSyncStates,
  ingestionFences,
  integrations,
  jobRuns,
  projects,
  sites,
} from "@seo/db";

interface Credentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  siteUrl?: string;
}
interface AnalyticsRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}
interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
}

const GSC_ROWS_PER_REQUEST = 25_000;
const DEFAULT_GSC_MAX_ROWS_PER_SYNC = 100_000;

@Injectable()
export class GscProcessor implements OnModuleInit, OnModuleDestroy {
  private worker: Worker;
  private readonly s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT || "http://localhost:9002",
    region: process.env.S3_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY || "minio",
      secretAccessKey: process.env.S3_SECRET_KEY || "minio12345",
    },
    forcePathStyle: true,
  });

  onModuleInit() {
    this.worker = new Worker(
      "gsc-queue",
      async (job: Job<GscSyncJobData>) => {
        try {
          await this.markActive(job);
          await this.handle(job);
        } catch (error) {
          if (!isRetryableJobError(error))
            throw new UnrecoverableError(
              error instanceof Error
                ? error.message
                : "Non-retryable GSC job failure",
            );
          throw error;
        }
      },
      {
        connection: {
          host: process.env.REDIS_HOST || "localhost",
          port: Number(process.env.REDIS_PORT || 6379),
        },
        concurrency: 1,
      },
    );
    this.worker.on("completed", (job) => this.markCompleted(job));
    this.worker.on("failed", (job, error) => {
      if (
        job &&
        (error instanceof UnrecoverableError ||
          job.attemptsMade >= (job.opts.attempts || 1))
      )
        return this.markFailed(job, error);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async handle(job: Job<GscSyncJobData>) {
    if (!isValidGscSyncJobData(job.data))
      throw nonRetryableJobError(
        "invalid_payload",
        "Invalid GSC sync job payload",
      );
    const data = job.data;
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.id, data.projectId),
          eq(projects.workspaceId, data.workspaceId),
        ),
      )
      .limit(1);
    if (!project)
      throw nonRetryableJobError(
        "tenant_scope_violation",
        "GSC project does not belong to the requested workspace",
      );
    const [integration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.projectId, data.projectId),
          eq(integrations.provider, "google_search_console"),
        ),
      )
      .limit(1);
    if (!integration)
      throw nonRetryableJobError(
        "provider_authentication_failed",
        "GSC integration is not connected",
      );
    if (integration.status !== "active")
      throw nonRetryableJobError(
        "provider_authentication_failed",
        "GSC integration is not active; reconnect is required",
      );
    let credentials: Credentials;
    try {
      credentials = JSON.parse(decryptToken(integration.credentials));
    } catch {
      throw nonRetryableJobError(
        "provider_authentication_failed",
        "GSC credentials are invalid",
      );
    }
    if (credentials.siteUrl !== data.siteUrl)
      throw nonRetryableJobError(
        "tenant_scope_violation",
        "GSC selected property does not match job payload",
      );
    const accessToken = await this.getAccessToken(credentials, integration.id);
    const [site] = await db
      .select({ id: sites.id })
      .from(sites)
      .where(eq(sites.projectId, data.projectId))
      .limit(1);
    if (!site)
      throw nonRetryableJobError(
        "invalid_target",
        "A project site is required before GSC sync",
      );
    if (!(await this.acquireFence(job))) return;
    let queryRows: AnalyticsRow[] = [];
    let pageRows: AnalyticsRow[] = [];
    try {
      queryRows = await this.queryAnalytics(accessToken, data, [
        "date",
        "query",
      ]);
    } catch (error) {
      await this.writeRawArtifact(job, data, queryRows, pageRows, ["query"]);
      throw error;
    }
    try {
      pageRows = await this.queryAnalytics(accessToken, data, ["date", "page"]);
    } catch (error) {
      await this.writeRawArtifact(job, data, queryRows, pageRows, ["page"]);
      throw error;
    }
    await this.writeRawArtifact(job, data, queryRows, pageRows);
    const database = process.env.CLICKHOUSE_DB || "seo_platform";
    await clickhouse.insert({
      table: `${database}.gsc_query_daily`,
      values: queryRows.map((row) => this.toFact(row, site.id, "query")),
      format: "JSONEachRow",
    });
    await clickhouse.insert({
      table: `${database}.gsc_page_daily`,
      values: pageRows.map((row) => this.toFact(row, site.id, "page")),
      format: "JSONEachRow",
    });
    await this.completeFence(job);
    await db
      .insert(gscSyncStates)
      .values({
        workspaceId: data.workspaceId,
        projectId: data.projectId,
        state: "completed",
        lastSuccessfulSyncAt: new Date(),
        lastSyncStartDate: data.startDate,
        lastSyncEndDate: data.endDate,
        retryCount: job.attemptsMade,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: gscSyncStates.projectId,
        set: {
          state: "completed",
          lastSuccessfulSyncAt: new Date(),
          lastSyncStartDate: data.startDate,
          lastSyncEndDate: data.endDate,
          lastErrorCode: null,
          lastErrorMessage: null,
          retryCount: job.attemptsMade,
          updatedAt: new Date(),
        },
      });
  }

  private async getAccessToken(
    credentials: Credentials,
    integrationId: string,
  ) {
    if (credentials.expiresAt > Date.now() + 60_000)
      return credentials.accessToken;
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GSC_OAUTH_CLIENT_ID || "",
        client_secret: process.env.GSC_OAUTH_CLIENT_SECRET || "",
        refresh_token: credentials.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const token = (await response
      .json()
      .catch(() => ({}))) as GoogleTokenResponse;
    if (!response.ok || !token.access_token)
      throw nonRetryableJobError(
        "provider_authentication_failed",
        "GSC token refresh failed",
      );

    const expiresInSeconds =
      Number.isFinite(token.expires_in) &&
      token.expires_in &&
      token.expires_in > 0
        ? token.expires_in
        : 3600;
    const refreshedCredentials: Credentials = {
      ...credentials,
      accessToken: token.access_token,
      refreshToken: token.refresh_token || credentials.refreshToken,
      expiresAt: Date.now() + expiresInSeconds * 1000,
    };
    await db
      .update(integrations)
      .set({
        credentials: encryptToken(JSON.stringify(refreshedCredentials)),
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, integrationId));
    return refreshedCredentials.accessToken;
  }

  private async queryAnalytics(
    accessToken: string,
    data: GscSyncJobData,
    dimensions: string[],
  ) {
    const rows: AnalyticsRow[] = [];
    const maxRows = this.getMaxRowsPerSync();

    for (
      let startRow = 0;
      startRow < maxRows;
      startRow += GSC_ROWS_PER_REQUEST
    ) {
      const rowLimit = Math.min(GSC_ROWS_PER_REQUEST, maxRows - startRow);
      const response = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(data.siteUrl)}/searchAnalytics/query`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            startDate: data.startDate,
            endDate: data.endDate,
            dimensions,
            rowLimit,
            startRow,
          }),
        },
      );
      if (response.status === 429)
        throw new JobProcessingError(
          "provider_quota_exhausted",
          "GSC quota exhausted",
          true,
        );
      if (!response.ok)
        throw new JobProcessingError(
          "transient_provider_failure",
          "GSC Search Analytics request failed",
          response.status >= 500,
        );

      const pageRows =
        ((await response.json()) as { rows?: AnalyticsRow[] }).rows || [];
      rows.push(...pageRows);
      if (pageRows.length < rowLimit) return rows;
    }

    throw nonRetryableJobError(
      "provider_row_limit_exceeded",
      `GSC response exceeded the configured ${maxRows}-row sync budget`,
    );
  }

  private async writeRawArtifact(
    job: Job<GscSyncJobData>,
    data: GscSyncJobData,
    queryRows: AnalyticsRow[],
    pageRows: AnalyticsRow[],
    failedDimensions: string[] = [],
  ) {
    const suffix =
      failedDimensions.length > 0
        ? `attempt-${job.attemptsMade}-partial`
        : "search-analytics";
    const rawKey = `raw/gsc/${data.workspaceId}/${data.projectId}/${data.ingestionKey}/${suffix}.json`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET || "seo-platform-raw",
        Key: rawKey,
        Body: JSON.stringify({
          requestedDateRange: {
            startDate: data.startDate,
            endDate: data.endDate,
          },
          partial: failedDimensions.length > 0,
          failedDimensions,
          queryRows,
          pageRows,
        }),
        ContentType: "application/json",
        Metadata: {
          workspace_id: data.workspaceId,
          project_id: data.projectId,
          ingestion_key: data.ingestionKey,
          partial: String(failedDimensions.length > 0),
        },
      }),
    );
  }

  private getMaxRowsPerSync() {
    const configured = Number(process.env.GSC_MAX_ROWS_PER_SYNC);
    return Number.isInteger(configured) && configured > 0
      ? configured
      : DEFAULT_GSC_MAX_ROWS_PER_SYNC;
  }

  private toFact(row: AnalyticsRow, siteId: string, field: "query" | "page") {
    return {
      date: row.keys?.[0] || "",
      site_id: siteId,
      [field]: row.keys?.[1] || "",
      clicks: Math.max(0, Math.round(row.clicks || 0)),
      impressions: Math.max(0, Math.round(row.impressions || 0)),
      ctr: Number(row.ctr || 0),
      position: Number(row.position || 0),
    };
  }
  private async acquireFence(job: Job<GscSyncJobData>) {
    const [created] = await db
      .insert(ingestionFences)
      .values({
        workspaceId: job.data.workspaceId,
        ingestionKey: job.data.ingestionKey,
        ownerIdempotencyKey: job.data.idempotencyKey,
        state: "writing",
      })
      .onConflictDoNothing()
      .returning();
    if (created) {
      await this.markIngestionState(job, "writing", {
        ingestionStartedAt: new Date(),
      });
      return true;
    }
    const [existing] = await db
      .select({ state: ingestionFences.state })
      .from(ingestionFences)
      .where(
        and(
          eq(ingestionFences.workspaceId, job.data.workspaceId),
          eq(ingestionFences.ingestionKey, job.data.ingestionKey),
        ),
      )
      .limit(1);
    if (existing?.state === "completed") {
      await this.markIngestionState(job, "completed", {
        ingestionCompletedAt: new Date(),
      });
      return false;
    }
    await this.markIngestionState(job, "reconciliation_required");
    throw nonRetryableJobError(
      "ingestion_reconciliation_required",
      "GSC ingestion fence requires reconciliation",
    );
  }
  private async completeFence(job: Job<GscSyncJobData>) {
    await db
      .update(ingestionFences)
      .set({
        state: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(ingestionFences.workspaceId, job.data.workspaceId),
          eq(ingestionFences.ingestionKey, job.data.ingestionKey),
        ),
      );
    await this.markIngestionState(job, "completed", {
      ingestionCompletedAt: new Date(),
    });
  }
  private async markIngestionState(
    job: Job<GscSyncJobData>,
    ingestionState: string,
    timestamps: { ingestionStartedAt?: Date; ingestionCompletedAt?: Date } = {},
  ) {
    await db
      .update(jobRuns)
      .set({ ingestionState, ...timestamps, updatedAt: new Date() })
      .where(
        and(
          eq(jobRuns.workspaceId, job.data.workspaceId),
          eq(jobRuns.idempotencyKey, job.data.idempotencyKey),
        ),
      );
  }
  private async markActive(job: Job<GscSyncJobData>) {
    await db
      .update(jobRuns)
      .set({
        state: "active",
        attemptCount: job.attemptsMade + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(jobRuns.workspaceId, job.data.workspaceId),
          eq(jobRuns.idempotencyKey, job.data.idempotencyKey),
        ),
      );
    await db
      .update(gscSyncStates)
      .set({
        state: "active",
        lastSyncStartedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(gscSyncStates.workspaceId, job.data.workspaceId),
          eq(gscSyncStates.projectId, job.data.projectId),
        ),
      );
  }
  private async markCompleted(job: Job<GscSyncJobData>) {
    await db
      .update(jobRuns)
      .set({
        state: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(jobRuns.workspaceId, job.data.workspaceId),
          eq(jobRuns.idempotencyKey, job.data.idempotencyKey),
        ),
      );
  }
  private async markFailed(job: Job<GscSyncJobData>, error: Error) {
    const code =
      error instanceof JobProcessingError ? error.code : "unexpected_failure";
    await db
      .update(jobRuns)
      .set({
        state: "dead_lettered",
        errorCode: code,
        errorMessage:
          "GSC sync failed; inspect safe logs using the correlation ID",
        failedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(jobRuns.workspaceId, job.data.workspaceId),
          eq(jobRuns.idempotencyKey, job.data.idempotencyKey),
        ),
      );
    await db
      .update(gscSyncStates)
      .set({
        state: "failed",
        lastErrorCode: code,
        lastErrorMessage: "GSC sync failed; retry or reconnect the integration",
        retryCount: job.attemptsMade,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(gscSyncStates.workspaceId, job.data.workspaceId),
          eq(gscSyncStates.projectId, job.data.projectId),
        ),
      );
  }
}
