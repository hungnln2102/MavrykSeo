import { Counter, Gauge, register } from 'prom-client';
import { createServer } from 'http';

// Define metrics
export const crawlSuccessCounter = new Counter({
  name: 'crawl_success_total',
  help: 'Total crawled sites count',
  labelNames: ['status', 'reason'],
});

export const jobDeadLetterCounter = new Counter({
  name: 'job_dead_letter_total',
  help: 'Total jobs moved to the durable dead-letter state after final failure',
  labelNames: ['queue', 'job_name', 'error_code'],
});

export const aiTokensCounter = new Counter({
  name: 'ai_cost_tokens_total',
  help: 'Total AI tokens used',
  labelNames: ['model', 'type'],
});

export const aiCostUsdCounter = new Counter({
  name: 'ai_cost_usd_total',
  help: 'Total estimated AI cost in USD',
  labelNames: ['model'],
});

export const gscSyncLagGauge = new Gauge({
  name: 'gsc_sync_lag_seconds',
  help: 'Google Search Console data sync lag in seconds',
  labelNames: ['site_id'],
});

// Start metrics server
export function startMetricsServer() {
  const port = process.env.WORKER_METRICS_PORT || process.env.METRICS_PORT || '8084';
  const server = createServer(async (req, res) => {
    if (req.url === '/metrics') {
      res.setHeader('Content-Type', register.contentType);
      res.end(await register.metrics());
    } else if (req.url === '/health' || req.url === '/ready') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ status: 'ok' }));
    } else {
      res.statusCode = 404;
      res.end();
    }
  });

  server.listen(parseInt(port, 10), () => {
    console.log(`Worker metrics server listening on port ${port} at /metrics`);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Worker metrics port ${port} is already in use. Set WORKER_METRICS_PORT to another port.`);
      return;
    }

    console.error('Worker metrics server error:', error);
  });

  process.on('SIGTERM', () => {
    server.close(() => {
      console.log('Worker metrics server closed.');
    });
  });
}
