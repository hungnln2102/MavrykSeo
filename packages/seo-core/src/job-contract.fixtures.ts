import { CrawlJobData, createJobEnvelope, GscSyncJobData, RankJobData } from './jobs';

export const demoJobContractIds = {
  workspaceId: '00000000-0000-4000-8000-000000000002',
  projectId: '00000000-0000-4000-8000-000000000003',
  siteId: '00000000-0000-4000-8000-000000000004',
} as const;

export function createDemoCrawlJobFixture(): CrawlJobData {
  const envelope = createJobEnvelope('crawl.requested', [
    demoJobContractIds.workspaceId,
    demoJobContractIds.siteId,
    'contract-fixture',
  ]);

  return {
    ...envelope,
    workspaceId: demoJobContractIds.workspaceId,
    siteId: demoJobContractIds.siteId,
    ingestionKey: envelope.idempotencyKey,
  };
}

export function createDemoRankJobFixture(): RankJobData {
  const envelope = createJobEnvelope('rank.requested', [
    demoJobContractIds.workspaceId,
    demoJobContractIds.projectId,
    'seo platform contract fixture',
  ]);

  return {
    ...envelope,
    workspaceId: demoJobContractIds.workspaceId,
    projectId: demoJobContractIds.projectId,
    query: 'seo platform contract fixture',
    numResults: 20,
    ingestionKey: envelope.idempotencyKey,
  };
}

export function createDemoGscSyncJobFixture(): GscSyncJobData {
  const envelope = createJobEnvelope('gsc.sync.requested', [
    demoJobContractIds.workspaceId,
    demoJobContractIds.projectId,
    'https://example.com/',
    '2026-08-01',
    '2026-08-14',
  ]);

  return {
    ...envelope,
    workspaceId: demoJobContractIds.workspaceId,
    projectId: demoJobContractIds.projectId,
    siteUrl: 'https://example.com/',
    startDate: '2026-08-01',
    endDate: '2026-08-14',
    ingestionKey: envelope.idempotencyKey,
  };
}

export const serpContractFixtures = {
  countries: ['US', 'VN', 'UK', 'DE', 'FR'] as const,
  devices: ['desktop', 'mobile'] as const,
  features: {
    organic: 'organic',
    featured_snippet: 'featured_snippet',
    local_pack: 'local_pack',
    people_also_ask: 'people_also_ask',
  } as const,
  
  // Downstream mock responses for different API provider failure modes
  failures: {
    unauthorized403: {
      status: 403,
      error: 'Invalid API Key',
      message: 'Active key has been suspended or revoked.',
    },
    rateLimit429: {
      status: 429,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please backoff.',
    },
    downstream503: {
      status: 503,
      error: 'Service Unavailable',
      message: 'SERP proxy pool exhausted.',
    },
  },
};
