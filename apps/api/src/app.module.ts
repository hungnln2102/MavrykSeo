import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
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
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule {}

