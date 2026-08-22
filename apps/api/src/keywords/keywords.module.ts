import { Module } from '@nestjs/common';
import { KeywordsController } from './keywords.controller';
import { KeywordsService } from './keywords.service';
import { RankScheduleService } from './rank-schedule.service';

@Module({
  controllers: [KeywordsController],
  providers: [KeywordsService, RankScheduleService],
  exports: [KeywordsService, RankScheduleService],
})
export class KeywordsModule {}
