import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { db, projects, sites } from '@seo/db';
import { eq, isNotNull } from 'drizzle-orm';
import { SitesService } from './sites.service';

const DEFAULT_TICK_INTERVAL_MS = 60_000;

@Injectable()
export class CrawlScheduleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CrawlScheduleService.name);
  private timer?: NodeJS.Timeout;
  private isRunning = false;

  constructor(private readonly sitesService: SitesService) {}

  onModuleInit() {
    if (process.env.CRAWL_SCHEDULER_ENABLED?.trim().toLowerCase() !== 'true') {
      this.logger.log('Scheduled crawl dispatcher is disabled.');
      return;
    }

    const tickInterval = this.getTickInterval();
    this.timer = setInterval(() => void this.dispatchDueCrawls(), tickInterval);
    void this.dispatchDueCrawls();
    this.logger.log(`Scheduled crawl dispatcher enabled with ${tickInterval}ms tick interval.`);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private getTickInterval(): number {
    const value = Number.parseInt(process.env.CRAWL_SCHEDULER_TICK_MS || '', 10);
    return Number.isSafeInteger(value) && value >= DEFAULT_TICK_INTERVAL_MS
      ? value
      : DEFAULT_TICK_INTERVAL_MS;
  }

  private async dispatchDueCrawls() {
    if (this.isRunning || process.env.CRAWL_KILL_SWITCH?.trim().toLowerCase() === 'true') {
      return;
    }

    this.isRunning = true;
    try {
      const scheduledSites = await db
        .select({
          siteId: sites.id,
          workspaceId: projects.workspaceId,
          crawlScheduleMinutes: sites.crawlScheduleMinutes,
        })
        .from(sites)
        .innerJoin(projects, eq(sites.projectId, projects.id))
        .where(isNotNull(sites.crawlScheduleMinutes));

      const now = new Date();
      for (const site of scheduledSites) {
        const cadence = site.crawlScheduleMinutes;
        if (!cadence || cadence < 60) continue;

        const windowStart = new Date(Math.floor(now.getTime() / (cadence * 60_000)) * cadence * 60_000);
        try {
          await this.sitesService.triggerScheduledCrawl(site.workspaceId, site.siteId, windowStart);
        } catch (error) {
          this.logger.warn(`Scheduled crawl was not dispatched for site ${site.siteId}: ${error instanceof Error ? error.message : 'unknown error'}`);
        }
      }
    } finally {
      this.isRunning = false;
    }
  }
}