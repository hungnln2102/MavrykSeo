import { createHash, randomUUID } from 'crypto';

export const JOB_SCHEMA_VERSION = 1;

export interface JobEnvelope {
  schemaVersion: typeof JOB_SCHEMA_VERSION;
  correlationId: string;
  idempotencyKey: string;
}

export type JobErrorCode =
  | 'invalid_payload'
  | 'tenant_scope_violation'
  | 'invalid_target'
  | 'crawl_disabled'
  | 'provider_authentication_failed'
  | 'provider_quota_exhausted'
  | 'ingestion_reconciliation_required'
  | 'transient_provider_failure'
  | 'storage_failure'
  | 'unexpected_failure';

export class JobProcessingError extends Error {
  constructor(
    public readonly code: JobErrorCode,
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'JobProcessingError';
  }
}

export function nonRetryableJobError(code: Exclude<JobErrorCode, 'transient_provider_failure' | 'storage_failure' | 'unexpected_failure'>, message: string): JobProcessingError {
  return new JobProcessingError(code, message, false);
}

export function retryableJobError(code: Extract<JobErrorCode, 'transient_provider_failure' | 'storage_failure' | 'unexpected_failure'>, message: string): JobProcessingError {
  return new JobProcessingError(code, message, true);
}

export function isRetryableJobError(error: unknown): boolean {
  return !(error instanceof JobProcessingError) || error.retryable;
}

export function createJobEnvelope(operation: string, idempotencyParts: readonly string[]): JobEnvelope {
  const digest = createHash('sha256')
    .update(JSON.stringify([operation, ...idempotencyParts]))
    .digest('hex')
    .slice(0, 32);

  return {
    schemaVersion: JOB_SCHEMA_VERSION,
    correlationId: randomUUID(),
    idempotencyKey: `${operation.replace(/[^a-z0-9]+/gi, '-')}-${digest}`.toLowerCase(),
  };
}

export function isValidJobEnvelope(value: Partial<JobEnvelope>): value is JobEnvelope {
  return value.schemaVersion === JOB_SCHEMA_VERSION
    && typeof value.correlationId === 'string'
    && value.correlationId.length > 0
    && typeof value.idempotencyKey === 'string'
    && value.idempotencyKey.length > 0;
}
