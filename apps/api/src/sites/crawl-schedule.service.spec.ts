import { db } from '@seo/db';
import { CrawlScheduleService } from './crawl-schedule.service';

jest.mock('@seo/db', () => ({
  db: { select: jest.fn() },
  projects: { workspaceId: 'projects.workspaceId', id: 'projects.id' },
  sites: { id: 'sites.id', projectId: 'sites.projectId', crawlScheduleMinutes: 'sites.crawlScheduleMinutes' },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn(),
  isNotNull: jest.fn(),
}));

const mockSelect = db.select as jest.Mock;

describe('CrawlScheduleService', () => {
  const triggerScheduledCrawl = jest.fn();
  let service: CrawlScheduleService;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.CRAWL_KILL_SWITCH;
    service = new CrawlScheduleService({ triggerScheduledCrawl } as any);
  });

  it('dispatches configured sites into their deterministic execution window', async () => {
    const now = new Date('2026-08-13T10:37:00.000Z');
    jest.useFakeTimers().setSystemTime(now);
    mockSelect.mockReturnValue({
      from: () => ({
        innerJoin: () => ({
          where: jest.fn().mockResolvedValue([
            { siteId: 'site-1', workspaceId: 'workspace-1', crawlScheduleMinutes: 60 },
          ]),
        }),
      }),
    });
    triggerScheduledCrawl.mockResolvedValue(undefined);

    await (service as any).dispatchDueCrawls();

    expect(triggerScheduledCrawl).toHaveBeenCalledWith(
      'workspace-1',
      'site-1',
      new Date('2026-08-13T10:00:00.000Z'),
    );
    jest.useRealTimers();
  });

  it('does not dispatch scheduled crawls while the system kill switch is enabled', async () => {
    process.env.CRAWL_KILL_SWITCH = 'true';

    await (service as any).dispatchDueCrawls();

    expect(mockSelect).not.toHaveBeenCalled();
    expect(triggerScheduledCrawl).not.toHaveBeenCalled();
  });
});