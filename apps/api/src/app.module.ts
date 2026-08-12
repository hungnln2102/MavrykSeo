import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { ProjectsModule } from './projects/projects.module';
import { SitesModule } from './sites/sites.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { ReportsModule } from './reports/reports.module';
import { KeywordsModule } from './keywords/keywords.module';
import { ContentModule } from './content/content.module';
import { RateLimitGuard } from './tenancy/rate-limit.guard';
import { IntegrationsModule } from './integrations/integrations.module';
import { AuditLogInterceptor } from './tenancy/audit-log.interceptor';
import { TerminusModule } from '@nestjs/terminus';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    AuthModule,
    WorkspacesModule,
    ProjectsModule,
    SitesModule,
    RecommendationsModule,
    ReportsModule,
    KeywordsModule,
    ContentModule,
    IntegrationsModule,
    TerminusModule,
    MetricsModule,
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 15,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule {}

