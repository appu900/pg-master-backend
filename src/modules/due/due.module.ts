import { StaffModule } from '../staff/staff.module';
import { Module } from '@nestjs/common';
import { DuesController } from './due.controller';
import { DueService } from './due.service';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [StaffModule, EventEmitterModule],
  controllers: [DuesController],
  providers: [DueService],
  exports: [],
})
export class DueModule {}
