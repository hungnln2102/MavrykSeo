import { Global, Module } from '@nestjs/common';
import { makeCounterProvider, makeGaugeProvider, PrometheusModule } from '@willsoto/nestjs-prometheus';
import { MetricsService } from './metrics.service';

@Global()
@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
  providers: [
    MetricsService,
    makeGaugeProvider({
      name: 'gsc_sync_lag_seconds',
      help: 'Google Search Console data sync lag in seconds',
      labelNames: ['site_id'],
    }),
    makeCounterProvider({
      name: 'crawl_success_total',
      help: 'Total crawled sites count',
      labelNames: ['status', 'reason'],
    }),
    makeCounterProvider({
      name: 'ai_cost_tokens_total',
      help: 'Total AI tokens used',
      labelNames: ['model', 'type'],
    }),
    makeCounterProvider({
      name: 'ai_cost_usd_total',
      help: 'Total estimated AI cost in USD',
      labelNames: ['model'],
    }),
  ],
  exports: [MetricsService, PrometheusModule],
})
export class MetricsModule {}
