import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { db, jobRuns, projects, sites } from '@seo/db';
import { and, eq } from 'drizzle-orm';
import { SitesService } from './sites.service';

const mockQueueAdd = jest.fn();

jest.mock('@seo/db', () => ({
  db: { select: jest.fn(), insert: jest.fn(), update: jest.fn() },
  jobRuns: { id: 'job_runs.id', workspaceId: 'job_runs.workspaceId', projectId: 'job_runs.projectId', queueName: 'job_runs.queueName', state: 'job_runs.state', idempotencyKey: 'job_runs.idempotencyKey', ingestionKey: 'job_runs.ingestionKey' },
  projects: { id: 'projects.id', workspaceId: 'projects.workspaceId', crawlEnabled: 'projects.crawlEnabled', crawlMaxConcurrentJobs: 'projects.crawlMaxConcurrentJobs' },
  sites: { id: 'sites.id', domain: 'sites.domain', projectId: 'sites.projectId', crawlScheduleMinutes: 'sites.crawlScheduleMinutes' },
  workspaces: { id: 'workspaces.id', crawlEnabled: 'workspaces.crawlEnabled', crawlMaxConcurrentJobs: 'workspaces.crawlMaxConcurrentJobs' },
}));

jest.mock('drizzle-orm', () => ({
  and: jest.fn((...conditions: unknown[]) => ({ type: 'and', conditions })),
  count: jest.fn(),
  eq: jest.fn((column: unknown, value: unknown) => ({ type: 'eq', column, value })),
  inArray: jest.fn((column: unknown, values: unknown[]) => ({ type: 'inArray', column, values })),
}));

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({ add: mockQueueAdd })),
}));

const mockClickhouseQuery = jest.fn();
jest.mock('@seo/clickhouse', () => ({
  clickhouse: {
    query: (...args: any[]) => mockClickhouseQuery(...args),
  },
}));

const mockS3Send = jest.fn();
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockS3Send })),
  GetObjectCommand: jest.fn().mockImplementation((args) => ({ type: 'GetObjectCommand', ...args })),
}));

const mockSelect = db.select as jest.Mock;
const mockInsert = db.insert as jest.Mock;
const mockUpdate = db.update as jest.Mock;
const mockAnd = and as jest.Mock;
const mockEq = eq as jest.Mock;

function mockScopedLookup(result: unknown[]) {
  mockSelect.mockReturnValue({
    from: () => ({
      innerJoin: () => ({
        where: () => ({ limit: jest.fn().mockResolvedValue(result) }),
      }),
      where: () => ({ limit: jest.fn().mockResolvedValue(result) }),
    }),
  });
}

function mockCrawlDispatchLookups(options: {
  site?: unknown[];
  workspace?: unknown[];
  project?: unknown[];
  activeJobs?: unknown[];
} = {}) {
  const site = options.site ?? [{ id: 'site-1', domain: 'example.com', projectId: 'project-1' }];
  const workspace = options.workspace ?? [{ crawlEnabled: true, crawlMaxConcurrentJobs: 2 }];
  const project = options.project ?? [{ crawlEnabled: true, crawlMaxConcurrentJobs: null }];
  const activeJobs = options.activeJobs ?? [{ value: 0 }];
  const limitedLookup = (result: unknown[]) => ({
    from: () => ({
      innerJoin: () => ({ where: () => ({ limit: jest.fn().mockResolvedValue(result) }) }),
      where: () => ({ limit: jest.fn().mockResolvedValue(result) }),
    }),
  });

  mockSelect
    .mockImplementationOnce(() => limitedLookup(site))
    .mockImplementationOnce(() => limitedLookup(workspace))
    .mockImplementationOnce(() => limitedLookup(project))
    .mockImplementationOnce(() => ({ from: () => ({ where: jest.fn().mockResolvedValue(activeJobs) }) }));
}

describe('SitesService tenant scoping', () => {
  let service: SitesService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSelect.mockReset();
    mockInsert.mockReset();
    mockUpdate.mockReset();
    delete process.env.CRAWL_KILL_SWITCH;
    mockInsert.mockReturnValue({
      values: () => ({
        onConflictDoNothing: () => ({ returning: jest.fn().mockResolvedValue([{ id: 'job-run-1' }]) }),
      }),
    });
    mockUpdate.mockReturnValue({
      set: () => ({ where: jest.fn().mockResolvedValue(undefined) }),
    });
    service = new SitesService();
  });

  it('rejects site creation when the requested project belongs to another workspace', async () => {
    mockScopedLookup([]);

    await expect(service.createSite('workspace-2', 'project-1', 'example.com')).rejects.toThrow(
      new NotFoundException('Project not found in this workspace'),
    );

    expect(mockEq).toHaveBeenCalledWith(projects.id, 'project-1');
    expect(mockEq).toHaveBeenCalledWith(projects.workspaceId, 'workspace-2');
    expect(mockSelect).toHaveBeenCalledTimes(1);
  });

  it('does not list sites for a project requested from another workspace', async () => {
    mockScopedLookup([]);

    await expect(service.getSites('workspace-2', 'project-1')).rejects.toThrow(
      new NotFoundException('Project not found in this workspace'),
    );

    expect(mockEq).toHaveBeenCalledWith(projects.workspaceId, 'workspace-2');
    expect(mockSelect).toHaveBeenCalledTimes(1);
  });

  it('rejects a crawl request for a site owned by another workspace without enqueueing a job', async () => {
    mockScopedLookup([]);

    await expect(service.triggerCrawl('workspace-2', 'site-1')).rejects.toThrow(
      new NotFoundException('Site not found in this workspace'),
    );

    expect(mockEq).toHaveBeenCalledWith(sites.id, 'site-1');
    expect(mockEq).toHaveBeenCalledWith(projects.workspaceId, 'workspace-2');
    expect(mockAnd).toHaveBeenCalledWith(
      { type: 'eq', column: sites.id, value: 'site-1' },
      { type: 'eq', column: projects.workspaceId, value: 'workspace-2' },
    );
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it('enqueues a tenant-scoped, idempotent crawl job with bounded retries', async () => {
    mockCrawlDispatchLookups();

    await expect(service.triggerCrawl('workspace-1', 'site-1')).resolves.toMatchObject({
      success: true,
      siteId: 'site-1',
    });

    expect(mockQueueAdd).toHaveBeenCalledWith(
      'crawl.requested',
      expect.objectContaining({
        schemaVersion: 1,
        workspaceId: 'workspace-1',
        siteId: 'site-1',
        correlationId: expect.any(String),
        idempotencyKey: expect.stringMatching(/^crawl-requested-[a-f0-9]{32}$/),
      }),
      {
        jobId: expect.stringMatching(/^crawl-requested-[a-f0-9]{32}$/),
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    );

    const [, jobData, options] = mockQueueAdd.mock.calls[0];
    expect(options.jobId).toBe(jobData.idempotencyKey);
    expect(jobData.ingestionKey).toBe(jobData.idempotencyKey);
    expect(mockInsert).toHaveBeenCalledWith(jobRuns);
  });

  it('blocks dispatch immediately when the operator kill switch is enabled', async () => {
    process.env.CRAWL_KILL_SWITCH = 'true';
    mockScopedLookup([{ id: 'site-1', domain: 'example.com', projectId: 'project-1' }]);

    await expect(service.triggerCrawl('workspace-1', 'site-1')).rejects.toThrow(ForbiddenException);
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it('blocks dispatch when the workspace crawl policy is disabled', async () => {
    mockCrawlDispatchLookups({ workspace: [{ crawlEnabled: false, crawlMaxConcurrentJobs: 2 }] });

    await expect(service.triggerCrawl('workspace-1', 'site-1')).rejects.toThrow(ForbiddenException);
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it('blocks dispatch when active crawl jobs reach the scoped concurrency limit', async () => {
    mockCrawlDispatchLookups({
      workspace: [{ crawlEnabled: true, crawlMaxConcurrentJobs: 3 }],
      project: [{ crawlEnabled: true, crawlMaxConcurrentJobs: 1 }],
      activeJobs: [{ value: 1 }],
    });

    await expect(service.triggerCrawl('workspace-1', 'site-1')).rejects.toThrow(BadRequestException);
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it('does not enqueue a duplicate crawl execution window', async () => {
    mockCrawlDispatchLookups();
    mockInsert.mockReturnValue({
      values: () => ({
        onConflictDoNothing: () => ({ returning: jest.fn().mockResolvedValue([]) }),
      }),
    });

    await expect(service.triggerScheduledCrawl('workspace-1', 'site-1', new Date('2026-08-13T00:00:00.000Z'))).resolves.toMatchObject({
      success: true,
      message: 'Crawl run already exists for this execution window',
    });

    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  describe('getCrawlTechnicalDetails', () => {
    it('throws NotFoundException if site is not found in the workspace', async () => {
      mockSelect.mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            where: () => ({ limit: jest.fn().mockResolvedValue([]) }),
          }),
        }),
      });

      await expect(service.getCrawlTechnicalDetails('workspace-1', 'site-1', 'job-run-1')).rejects.toThrow(
        new NotFoundException('Site not found in this workspace'),
      );
    });

    it('throws NotFoundException if crawl job run is not found in the workspace', async () => {
      // site found
      mockSelect.mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            where: () => ({ limit: jest.fn().mockResolvedValue([{ projectId: 'project-1' }]) }),
          }),
        }),
      });
      // job run not found
      mockSelect.mockReturnValueOnce({
        from: () => ({
          where: () => ({ limit: jest.fn().mockResolvedValue([]) }),
        }),
      });

      await expect(service.getCrawlTechnicalDetails('workspace-1', 'site-1', 'job-run-1')).rejects.toThrow(
        new NotFoundException('Crawl job run not found'),
      );
    });

    it('successfully queries all 4 ClickHouse observation tables', async () => {
      // site found
      mockSelect.mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            where: () => ({ limit: jest.fn().mockResolvedValue([{ projectId: 'project-1' }]) }),
          }),
        }),
      });
      // job run found
      mockSelect.mockReturnValueOnce({
        from: () => ({
          where: () => ({ limit: jest.fn().mockResolvedValue([{ id: 'job-run-1', ingestionKey: 'ingest-key' }]) }),
        }),
      });

      mockClickhouseQuery.mockResolvedValue({
        json: jest.fn()
          .mockResolvedValueOnce([{ url: 'url1', latest_status_code: 200 }]) // crawl page
          .mockResolvedValueOnce([{ sitemap_url: 'sitemap-url', crawled_url: 'url1' }]) // sitemap
          .mockResolvedValueOnce([{ url: 'url1', text_parity_percent: 95 }]) // render
          .mockResolvedValueOnce([{ url: 'url1', performance_score: 90 }]), // pagespeed
      });

      const res = await service.getCrawlTechnicalDetails('workspace-1', 'site-1', 'job-run-1');
      expect(res).toEqual({
        crawlUrlObservations: [{ url: 'url1', latest_status_code: 200 }],
        sitemapObservations: [{ sitemap_url: 'sitemap-url', crawled_url: 'url1' }],
        renderObservations: [{ url: 'url1', text_parity_percent: 95 }],
        pagespeedObservations: [{ url: 'url1', performance_score: 90 }],
      });
      expect(mockClickhouseQuery).toHaveBeenCalledTimes(4);
    });
  });

  describe('getCrawlScreenshotStream', () => {
    it('throws NotFoundException if site is not found in workspace', async () => {
      mockSelect.mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            where: () => ({ limit: jest.fn().mockResolvedValue([]) }),
          }),
        }),
      });

      await expect(service.getCrawlScreenshotStream('workspace-1', 'site-1', 'job-run-1', 'https://example.com')).rejects.toThrow(
        new NotFoundException('Site not found in this workspace'),
      );
    });

    it('throws NotFoundException if job run is not found in workspace', async () => {
      // site found
      mockSelect.mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            where: () => ({ limit: jest.fn().mockResolvedValue([{ projectId: 'project-1' }]) }),
          }),
        }),
      });
      // job run not found
      mockSelect.mockReturnValueOnce({
        from: () => ({
          where: () => ({ limit: jest.fn().mockResolvedValue([]) }),
        }),
      });

      await expect(service.getCrawlScreenshotStream('workspace-1', 'site-1', 'job-run-1', 'https://example.com')).rejects.toThrow(
        new NotFoundException('Crawl job run not found'),
      );
    });

    it('returns response stream when S3 call succeeds', async () => {
      // site found
      mockSelect.mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            where: () => ({ limit: jest.fn().mockResolvedValue([{ projectId: 'project-1' }]) }),
          }),
        }),
      });
      // job run found
      mockSelect.mockReturnValueOnce({
        from: () => ({
          where: () => ({ limit: jest.fn().mockResolvedValue([{ ingestionKey: 'ingest-key' }]) }),
        }),
      });

      const mockStream = { pipe: jest.fn() };
      mockS3Send.mockResolvedValueOnce({ Body: mockStream });

      const stream = await service.getCrawlScreenshotStream('workspace-1', 'site-1', 'job-run-1', 'https://example.com');
      expect(stream).toBe(mockStream);
      expect(mockS3Send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'GetObjectCommand',
          Bucket: process.env.S3_BUCKET || 'seo-platform-raw',
        })
      );
    });

    it('throws NotFoundException if S3 send throws error', async () => {
      // site found
      mockSelect.mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            where: () => ({ limit: jest.fn().mockResolvedValue([{ projectId: 'project-1' }]) }),
          }),
        }),
      });
      // job run found
      mockSelect.mockReturnValueOnce({
        from: () => ({
          where: () => ({ limit: jest.fn().mockResolvedValue([{ ingestionKey: 'ingest-key' }]) }),
        }),
      });

      mockS3Send.mockRejectedValueOnce(new Error('S3 Connection Failed'));

      await expect(service.getCrawlScreenshotStream('workspace-1', 'site-1', 'job-run-1', 'https://example.com')).rejects.toThrow(
        new NotFoundException('Failed to retrieve screenshot from S3: S3 Connection Failed'),
      );
    });
  });
});
