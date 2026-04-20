import { Module } from '@nestjs/common';
import { DuesController } from './due.controller';
import { DueService } from './due.service';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [EventEmitterModule],
  controllers: [DuesController],
  providers: [DueService],
  exports: [],
})
export class DueModule {}
