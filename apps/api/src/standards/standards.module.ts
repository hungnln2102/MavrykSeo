import { Module } from '@nestjs/common';
import { StandardsService } from './standards.service';
import { StandardsController } from './standards.controller';

@Module({
  providers: [StandardsService],
  controllers: [StandardsController],
  exports: [StandardsService],
})
export class StandardsModule {}
