import { Logger, OnModuleInit, Injectable } from '@nestjs/common';
import {
  BulkJobInput,
  IQueueProducer,
  QueueJobOptions,
} from 'src/core/ports/queue-producer.port';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ModuleRef } from '@nestjs/core';
import { QUEUES } from 'src/core/queue/queue.constants';

@Injectable()
export class BullMqProducerAdapter implements IQueueProducer, OnModuleInit {
  private readonly logger = new Logger(BullMqProducerAdapter.name);
  private readonly queues = new Map<string, Queue>();
  constructor(private readonly moduleRef: ModuleRef) {}
  async enqueue(
    queueName: string,
    jobName: string,
    data: any,
    opts?: QueueJobOptions,
  ): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.add(jobName, data, {
      jobId: opts?.jobId,
      delay: opts?.delay,
      priority: opts?.priority,
      attempts: opts?.attempts ?? 3,
      backoff: opts?.backOff ?? { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    });
    this.logger.debug(`ENQUED ${jobName} to ${queueName}`);
  }
  async bulkEnqueue(queueName: string, jobs: BulkJobInput[]): Promise<void> {
    const queue = this.getQueue(queueName);
    const bulkJobs = jobs.map((job) => ({
      name: job.name,
      data: job.data,
      opts: {
        jobId: job.opts?.jobId,
        delay: job.opts?.delay,
        priority: job.opts?.priority,
        attempts: job.opts?.attempts ?? 3,
        backoff: job.opts?.backOff ?? {
          type: 'exponential' as const,
          delay: 2000,
        },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    }));
    await queue.addBulk(bulkJobs)
    this.logger.log(`bulk enqueued`)
  }
  getWaitingCount(queueName: string): Promise<number> {
    return this.getQueue(queueName).getWaitingCount();
  }
  getActiveCount(queueName: string): Promise<number> {
   return this.getQueue(queueName).getActiveCount()
  }

  onModuleInit() {
    for (const queueName of Object.values(QUEUES)) {
      try {
        const queue = this.moduleRef.get<Queue>(getQueueToken(queueName), {
          strict: false,
        });
        this.queues.set(queueName, queue);
        this.logger.debug(`Registered Queue : ${queueName}`);
      } catch (error) {
        this.logger.warn(`'${queueName}' not registered in this module`);
      }
    }
  }

  private getQueue(name: string): Queue {
    const queue = this.queues.get(name);
    if (!queue) {
      throw new Error(`Queue ${name} not found in Bullmq adapter`);
    }
    return queue;
  }
}
