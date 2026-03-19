import { Module } from '@nestjs/common';
import { DuesController } from './due.controller';
import { DueService } from './due.service';

@Module({
  imports: [],
  controllers: [DuesController],
  providers: [DueService],
  exports: [],
})
export class DueModule {}
