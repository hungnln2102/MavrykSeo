import { Module } from '@nestjs/common';
import { CrawlProcessor } from './crawl.processor';
import { SerpProcessor } from './serp.processor';
import { DetectorProcessor } from './detector.processor';

@Module({
  imports: [],
  controllers: [],
  providers: [CrawlProcessor, SerpProcessor, DetectorProcessor],
})
export class AppModule {}
