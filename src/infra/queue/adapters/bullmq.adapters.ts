import {
  OnModuleDestroy,
  OnModuleInit,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Queue, QueueOptions } from 'bullmq';
import { IQueueService, JobOptions } from '../queue.interface';
import { QUEUES, QueueName } from '../queue.constants';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BullMQAdapter
  implements IQueueService, OnModuleDestroy, OnModuleInit
{
  private readonly logger = new Logger(BullMQAdapter.name);
  private readonly queues = new Map<string, Queue>();
  private readonly connectionOpts: QueueOptions['connection'];

  constructor(private readonly config: ConfigService) {
    this.connectionOpts = {
      host: config.getOrThrow('REDIS_HOST'),
      port: config.getOrThrow<number>('REDIS_PORT'),
      password: config.get('REDIS_PASSWORD'),
      tls: config.get('REDIS_TLS') === 'true' ? {} : undefined,
    };
  }

  onModuleInit() {
    for (const name of Object.values(QUEUES)) {
      this.getOrCreate(name);
    }
    this.logger.log('Bullmq queues intialized');
  }

  async onModuleDestroy() {
    await Promise.all(Array.from(this.queues.values()).map((q) => q.close()));
  }

  async enqueue<T>(
    queue: string,
    jobName: string,
    data: T,
    opts?: JobOptions,
  ): Promise<void> {
    const q = this.getOrCreate(queue);
    await q.add(jobName, data, {
      delay: opts?.delay,
      jobId: opts?.jobId,
      priority: opts?.priority,
      attempts: opts?.attempts,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 1_000 },
    });
  }

  private getOrCreate(name: string): Queue {
    if (!this.queues.has(name)) {
      this.queues.set(
        name,
        new Queue(name, {
          connection: this.connectionOpts,
          defaultJobOptions: { attempts: 3 },
        }),
      );
    }
    return this.queues.get(name)!;
  }
}
