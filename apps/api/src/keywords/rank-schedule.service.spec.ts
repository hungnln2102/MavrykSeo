import { db } from '@seo/db';
import { clickhouse } from '@seo/clickhouse';
import { RankScheduleService } from './rank-schedule.service';

jest.mock('@seo/db', () => ({
  db: { select: jest.fn() },
  projects: { id: 'projects.id', workspaceId: 'projects.workspaceId' },
  keywords: { id: 'keywords.id', projectId: 'keywords.projectId', keyword: 'keywords.keyword', trackingStatus: 'keywords.trackingStatus' },
}));

jest.mock('@seo/clickhouse', () => ({
  clickhouse: { query: jest.fn() },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn(),
}));

const mockSelect = db.select as jest.Mock;
const mockClickhouseQuery = clickhouse.query as jest.Mock;

describe('RankScheduleService', () => {
  const triggerRankSync = jest.fn();
  let service: RankScheduleService;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SERP_KILL_SWITCH;
    delete process.env.RANK_SCHEDULER_ENABLED;
    service = new RankScheduleService({ triggerRankSync } as any);
  });

  it('dispatches stale active keywords when they exceed 24 hours or have never been tracked', async () => {
    const now = new Date('2026-08-22T12:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    mockSelect.mockReturnValue({
      from: () => ({
        innerJoin: () => ({
          where: jest.fn().mockResolvedValue([
            { id: 'kw-1', projectId: 'project-1', keyword: 'seo tools', workspaceId: 'workspace-1' },
            { id: 'kw-2', projectId: 'project-2', keyword: 'rank tracker', workspaceId: 'workspace-1' },
          ]),
        }),
      }),
    });

    const mockJson = jest.fn().mockResolvedValue([
      { project_id: 'project-1', keyword: 'seo tools', latest_timestamp: '2026-08-21T10:00:00.000Z' },
    ]);
    mockClickhouseQuery.mockResolvedValue({ json: mockJson });

    triggerRankSync.mockResolvedValue(undefined);

    await (service as any).dispatchDueRanks();

    expect(triggerRankSync).toHaveBeenCalledTimes(2);
    expect(triggerRankSync).toHaveBeenCalledWith('workspace-1', 'project-1', 'seo tools');
    expect(triggerRankSync).toHaveBeenCalledWith('workspace-1', 'project-2', 'rank tracker');

    jest.useRealTimers();
  });

  it('does not dispatch rankings sync while the SERP kill switch is enabled', async () => {
    process.env.SERP_KILL_SWITCH = 'true';

    await (service as any).dispatchDueRanks();

    expect(mockSelect).not.toHaveBeenCalled();
    expect(triggerRankSync).not.toHaveBeenCalled();
  });
});
