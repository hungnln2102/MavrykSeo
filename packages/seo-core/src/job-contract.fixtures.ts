import { CrawlJobData, createJobEnvelope, RankJobData } from './jobs';

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
