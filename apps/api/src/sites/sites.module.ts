import { Module } from '@nestjs/common';
import { SitesService } from './sites.service';
import { SitesController } from './sites.controller';
import { AuthModule } from '../auth/auth.module';
import { CrawlScheduleService } from './crawl-schedule.service';

@Module({
  imports: [AuthModule],
  controllers: [SitesController],
  providers: [SitesService, CrawlScheduleService],
  exports: [SitesService],
})
export class SitesModule {}
