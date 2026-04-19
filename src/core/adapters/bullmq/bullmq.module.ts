import { Module, Global } from '@nestjs/common';
import { RedisModule } from 'src/infra/redis/redis.module';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from 'src/core/queue/queue.constants';
import { QUEUE_PRODUCER } from 'src/core/ports/queue-producer.port';
import { BullMqProducerAdapter } from './bullmq-producer.adapter';
import { QUEUE_CONSUMER } from 'src/core/ports/queue-consumer.port';

@Global()
@Module({
  imports: [
    RedisModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: null,
        tls:{}
      },
      defaultJobOptions: {
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    }),
    ...Object.values(QUEUES).map((name) => BullModule.registerQueue({ name })),
  ],
  controllers: [],
  providers: [
    {
      provide: QUEUE_PRODUCER,
      useClass: BullMqProducerAdapter,
    },
  ],
  exports: [QUEUE_PRODUCER, BullModule],
})
export class BullMqModule {}
