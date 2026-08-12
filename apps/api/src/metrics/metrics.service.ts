import { Injectable } from '@nestjs/common';
import { Counter, Gauge } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric('gsc_sync_lag_seconds') public readonly gscSyncLag: Gauge<string>,
    @InjectMetric('crawl_success_total') public readonly crawlSuccess: Counter<string>,
    @InjectMetric('ai_cost_tokens_total') public readonly aiTokens: Counter<string>,
    @InjectMetric('ai_cost_usd_total') public readonly aiCostUsd: Counter<string>,
  ) {}

  recordGscLag(siteId: string, lagSeconds: number) {
    this.gscSyncLag.set({ site_id: siteId }, lagSeconds);
  }

  recordCrawl(status: 'success' | 'failed', reason?: string) {
    this.crawlSuccess.inc({ status, reason: reason || '' });
  }

  recordAiUsage(model: string, type: 'prompt' | 'completion', tokens: number, estimatedCostUsd: number) {
    this.aiTokens.inc({ model, type }, tokens);
    this.aiCostUsd.inc({ model }, estimatedCostUsd);
  }
}
