import { Module } from '@nestjs/common';
import { CrawlProcessor } from './crawl.processor';
import { SerpProcessor } from './serp.processor';
import { DetectorProcessor } from './detector.processor';
import { GscProcessor } from './gsc.processor';
import { AuditRunCoordinator } from './audit-run.coordinator';

@Module({
  imports: [],
  controllers: [],
  providers: [CrawlProcessor, SerpProcessor, DetectorProcessor, GscProcessor, AuditRunCoordinator],
})
export class AppModule {}
