import { NotFoundException } from '@nestjs/common';
import { db, projects } from '@seo/db';
import { and, eq } from 'drizzle-orm';
import { ContentService } from './content.service';

jest.mock('@seo/db', () => ({
  db: { select: jest.fn() },
  projects: { id: 'projects.id', workspaceId: 'projects.workspaceId' },
  topics: { id: 'topics.id', projectId: 'topics.projectId' },
  contentPlans: { id: 'contentPlans.id', projectId: 'contentPlans.projectId' },
  keywords: { projectId: 'keywords.projectId', keyword: 'keywords.keyword' },
  briefs: { contentPlanId: 'briefs.contentPlanId', projectId: 'briefs.projectId' },
}));

jest.mock('@seo/clickhouse', () => ({
  clickhouse: { query: jest.fn() },
}));

jest.mock('drizzle-orm', () => ({
  and: jest.fn((...conditions: unknown[]) => ({ type: 'and', conditions })),
  eq: jest.fn((column: unknown, value: unknown) => ({ type: 'eq', column, value })),
}));

const mockSelect = db.select as jest.Mock;
const mockAnd = and as jest.Mock;
const mockEq = eq as jest.Mock;

function mockProjectLookup(result: unknown[]) {
  mockSelect.mockReturnValue({
    from: () => ({
      where: () => ({ limit: jest.fn().mockResolvedValue(result) }),
    }),
  });
}

describe('ContentService tenant scoping', () => {
  const metricsService = { recordAiUsage: jest.fn() } as never;
  let service: ContentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ContentService(metricsService);
  });

  it.each([
    ['read topics', (instance: ContentService) => instance.getTopics('workspace-2', 'project-1')],
    ['update a content plan', (instance: ContentService) => instance.updateContentPlan('workspace-2', 'project-1', 'plan-1', { title: 'Updated' })],
  ])('rejects cross-workspace project access before attempting to %s', async (_operation, execute) => {
    mockProjectLookup([]);

    await expect(execute(service)).rejects.toThrow(new NotFoundException('Project not found'));

    expect(mockEq).toHaveBeenCalledWith(projects.id, 'project-1');
    expect(mockEq).toHaveBeenCalledWith(projects.workspaceId, 'workspace-2');
    expect(mockAnd).toHaveBeenCalledWith(
      { type: 'eq', column: projects.id, value: 'project-1' },
      { type: 'eq', column: projects.workspaceId, value: 'workspace-2' },
    );
    expect(mockSelect).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['generateBrief', (instance: ContentService) => instance.generateBrief('workspace-2', 'project-1', 'plan-1')],
    ['optimizeContent', (instance: ContentService) => instance.optimizeContent('workspace-2', 'project-1', 'plan-1', 'Draft body')],
  ])('rejects cross-workspace %s before calling AI services', async (_operation, execute) => {
    mockProjectLookup([]);
    const fetchMock = jest.fn();
    const originalFetch = global.fetch;
    global.fetch = fetchMock;

    try {
      await expect(execute(service)).rejects.toThrow(new NotFoundException('Project not found'));
    } finally {
      global.fetch = originalFetch;
    }

    expect(fetchMock).not.toHaveBeenCalled();
  });
});