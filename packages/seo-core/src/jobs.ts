import { createHash, randomUUID } from "crypto";

export const JOB_SCHEMA_VERSION = 1;

export interface JobEnvelope {
  schemaVersion: typeof JOB_SCHEMA_VERSION;
  correlationId: string;
  idempotencyKey: string;
}

export interface CrawlJobData extends JobEnvelope {
  workspaceId: string;
  siteId: string;
  userAgent?: string;
  ingestionKey: string;
  reprocessRawArtifactKey?: string;
  targetUrl?: string;
  isSitemapCrawl?: boolean;
}

export interface RankJobData extends JobEnvelope {
  workspaceId: string;
  projectId: string;
  query: string;
  numResults?: number;
  ingestionKey: string;
  device?: string;
  country?: string;
  reprocessRawArtifactKey?: string;
}

export interface GscSyncJobData extends JobEnvelope {
  workspaceId: string;
  projectId: string;
  siteUrl: string;
  startDate: string;
  endDate: string;
  ingestionKey: string;
}

export type JobErrorCode =
  | "invalid_payload"
  | "tenant_scope_violation"
  | "invalid_target"
  | "crawl_disabled"
  | "provider_authentication_failed"
  | "provider_quota_exhausted"
  | "provider_row_limit_exceeded"
  | "ingestion_reconciliation_required"
  | "transient_provider_failure"
  | "storage_failure"
  | "unexpected_failure";

export class JobProcessingError extends Error {
  constructor(
    public readonly code: JobErrorCode,
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "JobProcessingError";
  }
}

export function nonRetryableJobError(
  code: Exclude<
    JobErrorCode,
    "transient_provider_failure" | "storage_failure" | "unexpected_failure"
  >,
  message: string,
): JobProcessingError {
  return new JobProcessingError(code, message, false);
}

export function retryableJobError(
  code: Extract<
    JobErrorCode,
    "transient_provider_failure" | "storage_failure" | "unexpected_failure"
  >,
  message: string,
): JobProcessingError {
  return new JobProcessingError(code, message, true);
}

export function isRetryableJobError(error: unknown): boolean {
  return !(error instanceof JobProcessingError) || error.retryable;
}

export function createJobEnvelope(
  operation: string,
  idempotencyParts: readonly string[],
): JobEnvelope {
  const digest = createHash("sha256")
    .update(JSON.stringify([operation, ...idempotencyParts]))
    .digest("hex")
    .slice(0, 32);

  return {
    schemaVersion: JOB_SCHEMA_VERSION,
    correlationId: randomUUID(),
    idempotencyKey:
      `${operation.replace(/[^a-z0-9]+/gi, "-")}-${digest}`.toLowerCase(),
  };
}

export function isValidJobEnvelope(
  value: Partial<JobEnvelope>,
): value is JobEnvelope {
  return (
    value.schemaVersion === JOB_SCHEMA_VERSION &&
    typeof value.correlationId === "string" &&
    value.correlationId.length > 0 &&
    typeof value.idempotencyKey === "string" &&
    value.idempotencyKey.length > 0
  );
}

export function isValidCrawlJobData(
  value: Partial<CrawlJobData>,
): value is CrawlJobData {
  return (
    isValidJobEnvelope(value as Partial<JobEnvelope>) &&
    typeof value.workspaceId === "string" &&
    value.workspaceId.length > 0 &&
    typeof value.siteId === "string" &&
    value.siteId.length > 0 &&
    typeof value.ingestionKey === "string" &&
    value.ingestionKey.length > 0 &&
    (value.reprocessRawArtifactKey === undefined || typeof value.reprocessRawArtifactKey === "string")
  );
}

export function isValidRankJobData(
  value: Partial<RankJobData>,
): value is RankJobData {
  return (
    isValidJobEnvelope(value as Partial<JobEnvelope>) &&
    typeof value.workspaceId === "string" &&
    value.workspaceId.length > 0 &&
    typeof value.projectId === "string" &&
    value.projectId.length > 0 &&
    typeof value.query === "string" &&
    value.query.trim().length > 0 &&
    (value.numResults === undefined ||
      (Number.isInteger(value.numResults) && value.numResults > 0)) &&
    typeof value.ingestionKey === "string" &&
    value.ingestionKey.length > 0 &&
    (value.device === undefined || typeof value.device === "string") &&
    (value.country === undefined || typeof value.country === "string") &&
    (value.reprocessRawArtifactKey === undefined || typeof value.reprocessRawArtifactKey === "string")
  );
}

export function isValidGscSyncJobData(
  value: Partial<GscSyncJobData>,
): value is GscSyncJobData {
  return (
    isValidJobEnvelope(value as Partial<JobEnvelope>) &&
    typeof value.workspaceId === "string" &&
    value.workspaceId.length > 0 &&
    typeof value.projectId === "string" &&
    value.projectId.length > 0 &&
    typeof value.siteUrl === "string" &&
    value.siteUrl.length > 0 &&
    isIsoDate(value.startDate) &&
    isIsoDate(value.endDate) &&
    value.startDate <= value.endDate &&
    typeof value.ingestionKey === "string" &&
    value.ingestionKey.length > 0
  );
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}
