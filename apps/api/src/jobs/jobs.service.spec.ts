import { BadRequestException, NotFoundException } from '@nestjs/common';
import { db, jobRuns } from '@seo/db';
import { JobsService } from './jobs.service';

const mockQueueAdd = jest.fn();

jest.mock('@seo/db', () => ({
  db: { select: jest.fn(), insert: jest.fn(), update: jest.fn() },
  jobRuns: {
    id: 'job_runs.id',
    workspaceId: 'job_runs.workspaceId',
    state: 'job_runs.state',
    idempotencyKey: 'job_runs.idempotencyKey',
  },
}));

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({ add: mockQueueAdd })),
}));

jest.mock('drizzle-orm', () => ({
  and: jest.fn((...conditions: unknown[]) => ({ type: 'and', conditions })),
  eq: jest.fn((column: unknown, value: unknown) => ({ type: 'eq', column, value })),
}));

const mockSelect = db.select as jest.Mock;
const mockInsert = db.insert as jest.Mock;
const mockUpdate = db.update as jest.Mock;

const failedCrawlRun = {
  id: 'job-run-1',
  workspaceId: 'workspace-1',
  projectId: 'project-1',
  queueName: 'crawler-queue',
  jobName: 'crawl.requested',
  bullmqJobId: 'crawl-requested-old',
  idempotencyKey: 'crawl-requested-old',
  correlationId: 'correlation-old',
  state: 'dead_lettered',
  attemptCount: 3,
  maxAttempts: 3,
  errorCode: 'transient_provider_failure',
  errorMessage: 'Crawl job failed; inspect safe worker logs with the correlation ID',
  replayOfJobRunId: null,
  ingestionKey: 'logical-ingestion-1',
  payload: { workspaceId: 'workspace-1', projectId: 'project-1', siteId: 'site-1' },
  createdAt: new Date('2026-08-13T00:00:00Z'),
  completedAt: null,
  failedAt: new Date('2026-08-13T00:01:00Z'),
  updatedAt: new Date('2026-08-13T00:01:00Z'),
};

function mockSelectRows(rows: unknown[]) {
  mockSelect.mockReturnValue({
    from: () => ({
      where: () => ({ limit: jest.fn().mockResolvedValue(rows) }),
    }),
  });
}

describe('JobsService failed-job operations', () => {
  let service: JobsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new JobsService();
    mockInsert.mockReturnValue({ values: jest.fn().mockResolvedValue(undefined) });
    mockUpdate.mockReturnValue({
      set: () => ({ where: jest.fn().mockResolvedValue(undefined) }),
    });
  });

  it('returns only safe failed-job metadata for the active workspace', async () => {
    mockSelect.mockReturnValue({
      from: () => ({ where: jest.fn().mockResolvedValue([failedCrawlRun]) }),
    });

    await expect(service.getFailedJobs('workspace-1')).resolves.toEqual([
      expect.objectContaining({
        id: 'job-run-1',
        state: 'dead_lettered',
        projectId: 'project-1',
        errorCode: 'transient_provider_failure',
      }),
    ]);

    const [job] = await service.getFailedJobs('workspace-1');
    expect(job).not.toHaveProperty('payload');
    expect(job).not.toHaveProperty('workspaceId');
  });

  it('does not replay a job ID outside the active workspace', async () => {
    mockSelectRows([]);

    await expect(service.replayFailedJob('workspace-2', 'job-run-1')).rejects.toThrow(
      new NotFoundException('Failed job not found in this workspace'),
    );

    expect(mockQueueAdd).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('scopes failed-job listing queries to the active workspace', async () => {
    mockSelect.mockReturnValue({
      from: () => ({ where: jest.fn().mockResolvedValue([]) }),
    });

    await expect(service.getFailedJobs('workspace-2')).resolves.toEqual([]);

    expect(require('drizzle-orm').eq).toHaveBeenCalledWith(jobRuns.workspaceId, 'workspace-2');
    expect(require('drizzle-orm').eq).toHaveBeenCalledWith(jobRuns.state, 'dead_lettered');
  });

  it('replays a failed job with a new queue identity and persisted lineage', async () => {
    mockSelectRows([failedCrawlRun]);

    const result = await service.replayFailedJob('workspace-1', 'job-run-1');

    expect(result.replayedFromJobRunId).toBe('job-run-1');
    expect(result.job.idempotencyKey).not.toBe(failedCrawlRun.idempotencyKey);
    expect(mockInsert).toHaveBeenCalledWith(jobRuns);
    expect(mockQueueAdd).toHaveBeenCalledWith(
      'crawl.requested',
      expect.objectContaining({
        workspaceId: 'workspace-1',
        siteId: 'site-1',
        replayOfJobRunId: 'job-run-1',
        ingestionKey: 'logical-ingestion-1',
        idempotencyKey: result.job.idempotencyKey,
        correlationId: result.job.correlationId,
      }),
      expect.objectContaining({
        jobId: result.job.idempotencyKey,
        attempts: 3,
      }),
    );
  });

  it('rejects a corrupted replay payload instead of dispatching it', async () => {
    mockSelectRows([{ ...failedCrawlRun, payload: { workspaceId: 'workspace-2', siteId: 'site-1' } }]);

    await expect(service.replayFailedJob('workspace-1', 'job-run-1')).rejects.toThrow(
      new BadRequestException('Stored job payload is invalid for replay'),
    );

    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it('rejects a replay payload without a valid ingestion key before queue dispatch', async () => {
    mockSelectRows([{ ...failedCrawlRun, ingestionKey: null }]);

    await expect(service.replayFailedJob('workspace-1', 'job-run-1')).rejects.toThrow(
      new BadRequestException('Stored job payload is invalid for replay'),
    );

    expect(mockQueueAdd).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
