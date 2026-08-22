import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { db, keywords, projects } from '@seo/db';
import { clickhouse } from '@seo/clickhouse';
import { eq } from 'drizzle-orm';
import { KeywordsService } from './keywords.service';

const DEFAULT_TICK_INTERVAL_MS = 60_000;

@Injectable()
export class RankScheduleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RankScheduleService.name);
  private timer?: NodeJS.Timeout;
  private isRunning = false;

  constructor(private readonly keywordsService: KeywordsService) {}

  onModuleInit() {
    if (process.env.RANK_SCHEDULER_ENABLED?.trim().toLowerCase() !== 'true') {
      this.logger.log('Scheduled rank dispatcher is disabled.');
      return;
    }

    const tickInterval = this.getTickInterval();
    this.timer = setInterval(() => void this.dispatchDueRanks(), tickInterval);
    void this.dispatchDueRanks();
    this.logger.log(`Scheduled rank dispatcher enabled with ${tickInterval}ms tick interval.`);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private getTickInterval(): number {
    const value = Number.parseInt(process.env.RANK_SCHEDULER_TICK_MS || '', 10);
    return Number.isSafeInteger(value) && value >= 10_000 // min 10s for debug
      ? value
      : DEFAULT_TICK_INTERVAL_MS;
  }

  private async dispatchDueRanks() {
    if (this.isRunning || process.env.SERP_KILL_SWITCH?.trim().toLowerCase() === 'true') {
      return;
    }

    this.isRunning = true;
    try {
      this.logger.log('Running scheduled rank synchronization check...');

      // 1. Fetch all active keywords from PostgreSQL
      const activeKeywords = await db
        .select({
          id: keywords.id,
          projectId: keywords.projectId,
          keyword: keywords.keyword,
          workspaceId: projects.workspaceId,
        })
        .from(keywords)
        .innerJoin(projects, eq(keywords.projectId, projects.id))
        .where(eq(keywords.trackingStatus, 'active'));

      if (activeKeywords.length === 0) {
        this.logger.log('No active keywords to synchronize.');
        return;
      }

      // 2. Fetch all latest rank observations from ClickHouse
      const clickhouseDb = process.env.CLICKHOUSE_DB || 'seo_platform';
      const chQuery = `
        SELECT 
          project_id,
          keyword,
          max(timestamp) as latest_timestamp
        FROM ${clickhouseDb}.rank_observations
        GROUP BY project_id, keyword
      `;

      let chResults: any[] = [];
      try {
        const resultSet = await clickhouse.query({ query: chQuery, format: 'JSONEachRow' });
        chResults = (await resultSet.json()) as any[];
      } catch (err: any) {
        this.logger.error(`Failed to query latest rank observations from ClickHouse: ${err.message}`);
      }

      const lastTrackedMap = new Map<string, Date>();
      for (const r of chResults) {
        const key = `${r.project_id}:${r.keyword.toLowerCase().trim()}`;
        if (r.latest_timestamp) {
          lastTrackedMap.set(key, new Date(r.latest_timestamp));
        }
      }

      const now = new Date();
      let syncCount = 0;

      // 3. For each active keyword, check if it is stale (>24 hours) or never tracked
      for (const kw of activeKeywords) {
        const key = `${kw.projectId}:${kw.keyword.toLowerCase().trim()}`;
        const lastTracked = lastTrackedMap.get(key);

        let isStale = false;
        if (lastTracked) {
          const diffMs = now.getTime() - lastTracked.getTime();
          isStale = diffMs > 24 * 60 * 60 * 1000;
        } else {
          isStale = true; // Never tracked
        }

        if (isStale) {
          syncCount++;
          try {
            await this.keywordsService.triggerRankSync(kw.workspaceId, kw.projectId, kw.keyword);
            this.logger.log(`Scheduled sync triggered for keyword [${kw.keyword}] in project [${kw.projectId}]`);
          } catch (err: any) {
            this.logger.error(`Failed to sync rank for keyword [${kw.keyword}]: ${err.message}`);
          }
        }
      }

      this.logger.log(`Scheduled rank synchronization check completed. Triggered sync for ${syncCount} stale keywords.`);
    } catch (error: any) {
      this.logger.error(`Error during scheduled rank sync: ${error.message}`);
    } finally {
      this.isRunning = false;
    }
  }
}
