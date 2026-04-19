import { Module } from '@nestjs/common';
import { TestController } from './test.controller';
import { BullModule } from '@nestjs/bullmq';
import { QueueModule } from 'src/core/queue/queue.module';
import { QUEUES } from 'src/core/queue/queue.constants';

@Module({
  imports: [
  ],
  controllers: [TestController],
  providers: [],
  exports: [],
})
export class TestModule {}
