import {
  createJobEnvelope,
  createDemoCrawlJobFixture,
  createDemoRankJobFixture,
  demoJobContractIds,
  isRetryableJobError,
  isValidCrawlJobData,
  isValidJobEnvelope,
  isValidRankJobData,
  JOB_SCHEMA_VERSION,
  nonRetryableJobError,
  retryableJobError,
} from '@seo/core';

describe('job envelope contract', () => {
  it('creates a versioned envelope with a stable idempotency key for identical work', () => {
    const first = createJobEnvelope('crawl.requested', ['workspace-1', 'site-1']);
    const second = createJobEnvelope('crawl.requested', ['workspace-1', 'site-1']);

    expect(first.schemaVersion).toBe(JOB_SCHEMA_VERSION);
    expect(first.correlationId).not.toBe(second.correlationId);
    expect(first.idempotencyKey).toBe(second.idempotencyKey);
    expect(isValidJobEnvelope(first)).toBe(true);
  });

  it('changes the idempotency key when the operation input changes', () => {
    const crawl = createJobEnvelope('crawl.requested', ['workspace-1', 'site-1']);
    const differentSite = createJobEnvelope('crawl.requested', ['workspace-1', 'site-2']);
    const rank = createJobEnvelope('rank.requested', ['workspace-1', 'project-1', 'seo tools']);

    expect(crawl.idempotencyKey).not.toBe(differentSite.idempotencyKey);
    expect(crawl.idempotencyKey).not.toBe(rank.idempotencyKey);
  });

  it('rejects envelopes that omit required schema metadata', () => {
    expect(isValidJobEnvelope({ schemaVersion: JOB_SCHEMA_VERSION })).toBe(false);
    expect(isValidJobEnvelope({
      schemaVersion: JOB_SCHEMA_VERSION + 1,
      correlationId: 'correlation-1',
      idempotencyKey: 'idempotency-1',
    } as unknown as Partial<ReturnType<typeof createJobEnvelope>>)).toBe(false);
  });

  it('keeps the crawl fixture compatible with the API-to-worker contract', () => {
    const fixture = createDemoCrawlJobFixture();

    expect(fixture.workspaceId).toBe(demoJobContractIds.workspaceId);
    expect(fixture.siteId).toBe(demoJobContractIds.siteId);
    expect(fixture.ingestionKey).toBe(fixture.idempotencyKey);
    expect(isValidCrawlJobData(fixture)).toBe(true);
    expect(isValidCrawlJobData({ ...fixture, ingestionKey: '' })).toBe(false);
  });

  it('keeps the rank fixture compatible with the API-to-worker contract', () => {
    const fixture = createDemoRankJobFixture();

    expect(fixture.workspaceId).toBe(demoJobContractIds.workspaceId);
    expect(fixture.projectId).toBe(demoJobContractIds.projectId);
    expect(fixture.ingestionKey).toBe(fixture.idempotencyKey);
    expect(isValidRankJobData(fixture)).toBe(true);
    expect(isValidRankJobData({ ...fixture, numResults: 0 })).toBe(false);
    expect(isValidRankJobData({ ...fixture, ingestionKey: '' })).toBe(false);
  });

  it('classifies tenant and payload errors as non-retryable while provider failures remain retryable', () => {
    expect(isRetryableJobError(nonRetryableJobError('invalid_payload', 'Invalid payload'))).toBe(false);
    expect(isRetryableJobError(nonRetryableJobError('tenant_scope_violation', 'Workspace mismatch'))).toBe(false);
    expect(isRetryableJobError(nonRetryableJobError('ingestion_reconciliation_required', 'Reconcile ingestion'))).toBe(false);
    expect(isRetryableJobError(nonRetryableJobError('crawl_disabled', 'Crawling paused by operator'))).toBe(false);
    expect(isRetryableJobError(retryableJobError('transient_provider_failure', 'Provider timeout'))).toBe(true);
    expect(isRetryableJobError(new Error('Unexpected transport error'))).toBe(true);
  });
});
