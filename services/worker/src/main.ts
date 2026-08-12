import './instrumentation';
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { startMetricsServer } from './metrics';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  console.log('Worker service initialized. Awaiting BullMQ jobs...');
  
  startMetricsServer();
}
bootstrap();
