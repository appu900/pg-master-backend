import { Module,Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullMQAdapter } from './adapters/bullmq.adapters';
import { Queue } from 'bullmq';
import { QUEUE_SERVICE } from './queue.interface';




@Global()
@Module({
  imports: [ConfigModule],
  controllers: [],
  providers: [
    BullMQAdapter,
    { provide: QUEUE_SERVICE, useClass: BullMQAdapter },
  ],
  exports: [QUEUE_SERVICE],
})
export class QueueModule {}
