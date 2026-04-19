import { Logger, Injectable } from '@nestjs/common';
import {
  IQueueConsumer,
  jobHandler,
  QueueJob,
} from 'src/core/ports/queue-consumer.port';
import { RedisService } from 'src/infra/redis/redis.service';
import { Job, Worker } from 'bullmq';

@Injectable()
export class BullMqConsumerAdapter implements IQueueConsumer {
  private readonly logger = new Logger(BullMqConsumerAdapter.name);
  private readonly workers: Worker[] = [];

  constructor(private readonly redisService: RedisService) {}

  async registerHandler(queueName: string, handler: jobHandler): Promise<void> {
    const connection = await this.redisService.getConnection();
    const worker = new Worker(
      queueName,
      async (job: Job) => {
        const queueJob: QueueJob = {
          id: job.id || '',
          name: job.name || '',
          data: job.data,
          attemptsMade: job.attemptsMade,
          timestamp: job.timestamp,
        };
        await handler(queueJob);
      },
      {
        connection: { ...connection, port: connection?.port ? parseInt(connection.port as string, 10) : undefined },
        concurrency: 10,
        limiter: {
          max: 50,
          duration: 10000,
        },
      },
    );

    worker.on('failed', (job, error) => {
      this.logger.error(
        `Job ${job?.id} failed on ${queueName}: ${error.message}`,
        error.stack,
      );
    });
    worker.on('completed', (job) =>
      this.logger.debug(`Job ${job.id} completed on ${queueName}`),
    );
    worker.on('error', (error) =>
      this.logger.error(`worker error on ${queueName}: ${error.message}`),
    );
    this.workers.push(worker);
    this.logger.log(`Registered consumer for queue ${queueName}`);
  }
  async shutDown(): Promise<void> {
    this.logger.log('Shutting down all workers...');
    await Promise.all(this.workers.map((w) => w.close()));
    this.logger.debug('All workers hut down');
  }
}
