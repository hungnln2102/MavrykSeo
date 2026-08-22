import { NotFoundException } from '@nestjs/common';
import { db, jobRuns, keywords, projects } from '@seo/db';
import { and, eq } from 'drizzle-orm';
import { KeywordsService } from './keywords.service';

jest.mock('@seo/db', () => ({
  db: { select: jest.fn(), insert: jest.fn(), update: jest.fn() },
  jobRuns: { workspaceId: 'job_runs.workspaceId', idempotencyKey: 'job_runs.idempotencyKey' },
  keywords: { id: 'keywords.id', projectId: 'keywords.projectId', keyword: 'keywords.keyword' },
  projects: { id: 'projects.id', workspaceId: 'projects.workspaceId' },
  workspaces: { id: 'workspaces.id', plan: 'workspaces.plan' },
  systemConfigs: { key: 'system_configs.key', value: 'system_configs.value' },
}));

const mockQueueAdd = jest.fn();

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({ add: mockQueueAdd })),
}));

jest.mock('@seo/clickhouse', () => ({
  clickhouse: { query: jest.fn() },
}));

jest.mock('drizzle-orm', () => ({
  and: jest.fn((...conditions: unknown[]) => ({ type: 'and', conditions })),
  eq: jest.fn((column: unknown, value: unknown) => ({ type: 'eq', column, value })),
  sql: jest.fn((strings: string[], ...values: unknown[]) => ({ type: 'sql', strings, values })),
  inArray: jest.fn((column: unknown, values: unknown[]) => ({ type: 'inArray', column, values })),
}));

const mockSelect = db.select as jest.Mock;
const mockInsert = db.insert as jest.Mock;
const mockUpdate = db.update as jest.Mock;
const mockAnd = and as jest.Mock;
const mockEq = eq as jest.Mock;

function mockProjectLookup(result: unknown[]) {
  mockSelect.mockReturnValue({
    from: () => ({
      where: () => ({ limit: jest.fn().mockResolvedValue(result) }),
    }),
  });
}

describe('KeywordsService tenant scoping', () => {
  let service: KeywordsService;
  const metricsService = { recordAiUsage: jest.fn() } as never;
  const originalClickhouseMock = process.env.CLICKHOUSE_MOCK;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdate.mockReturnValue({
      set: () => ({ where: jest.fn().mockResolvedValue(undefined) }),
    });
    process.env.CLICKHOUSE_MOCK = 'true';
    service = new KeywordsService(metricsService);
  });

  afterAll(() => {
    if (originalClickhouseMock === undefined) {
      delete process.env.CLICKHOUSE_MOCK;
      return;
    }

    process.env.CLICKHOUSE_MOCK = originalClickhouseMock;
  });

  it.each([
    ['addKeyword', (instance: KeywordsService) => instance.addKeyword('workspace-2', 'project-1', 'seo tools')],
    ['getKeywords', (instance: KeywordsService) => instance.getKeywords('workspace-2', 'project-1')],
    ['deleteKeyword', (instance: KeywordsService) => instance.deleteKeyword('workspace-2', 'project-1', 'keyword-1')],
  ])('rejects cross-workspace project access before %s reads or mutates keywords', async (_operation, execute) => {
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

  it('rejects cross-workspace keyword clustering before calling collector or AI services', async () => {
    mockProjectLookup([]);
    const fetchMock = jest.fn();
    const originalFetch = global.fetch;
    global.fetch = fetchMock;

    try {
      await expect(service.clusterKeywords('workspace-2', 'project-1', ['seo tools'])).rejects.toThrow(
        new NotFoundException('Project not found'),
      );
    } finally {
      global.fetch = originalFetch;
    }

    expect(mockEq).toHaveBeenCalledWith(projects.workspaceId, 'workspace-2');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('enqueues a tenant-scoped, idempotent rank job with bounded retries', async () => {
    process.env.CLICKHOUSE_MOCK = 'false';
    service = new KeywordsService(metricsService);
    mockSelect
      .mockReturnValueOnce({
        from: () => ({ where: () => ({ limit: jest.fn().mockResolvedValue([{ id: 'project-1' }]) }) }),
      })
      .mockReturnValueOnce({
        from: () => ({ where: () => ({ limit: jest.fn().mockResolvedValue([]) }) }),
      })
      .mockReturnValueOnce({
        from: () => ({ where: () => ({ limit: jest.fn().mockResolvedValue([{ plan: 'free' }]) }) }),
      })
      .mockReturnValueOnce({
        from: () => ({ where: () => ({ limit: jest.fn().mockResolvedValue([{ value: '10' }]) }) }),
      })
      .mockReturnValueOnce({
        from: () => ({ where: jest.fn().mockResolvedValue([{ id: 'project-1' }]) }),
      })
      .mockReturnValueOnce({
        from: () => ({ where: jest.fn().mockResolvedValue([{ count: 0 }]) }),
      });
    mockInsert
      .mockReturnValueOnce({
        values: () => ({ returning: jest.fn().mockResolvedValue([{ id: 'keyword-1' }]) }),
      })
      .mockReturnValueOnce({
        values: () => ({ onConflictDoUpdate: jest.fn().mockResolvedValue(undefined) }),
      });

    await expect(service.addKeyword('workspace-1', 'project-1', ' SEO Tools ')).resolves.toEqual({ id: 'keyword-1' });

    expect(mockInsert).toHaveBeenCalledWith(keywords);
    expect(mockInsert).toHaveBeenCalledWith(jobRuns);
    expect(mockQueueAdd).toHaveBeenCalledWith(
      'rank.requested',
      expect.objectContaining({
        schemaVersion: 1,
        workspaceId: 'workspace-1',
        projectId: 'project-1',
        query: 'seo tools',
        numResults: 20,
        correlationId: expect.any(String),
        idempotencyKey: expect.stringMatching(/^rank-requested-[a-f0-9]{32}$/),
      }),
      {
        jobId: expect.stringMatching(/^rank-requested-[a-f0-9]{32}$/),
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    );

    const [, jobData, options] = mockQueueAdd.mock.calls[0];
    expect(options.jobId).toBe(jobData.idempotencyKey);
    expect(jobData.ingestionKey).toBe(jobData.idempotencyKey);
  });
});
