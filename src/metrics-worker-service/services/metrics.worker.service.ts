import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES } from 'src/core/queue/queue.constants';
import { MetricsHandlerRegistry } from '../registry/metrics.handler.registry';

/**
 * This worker will call the all matched eventtype --> metrics Handler
 * so that we can scale horizonatlly the code without touching the all other metrics worker
 * */

@Processor(QUEUES.METRICS, { concurrency: 10 })
@Injectable()
export class MetricsWorkerRunner extends WorkerHost {
  private readonly logger = new Logger(MetricsWorkerRunner.name);
  constructor(private readonly handlerRegistry:MetricsHandlerRegistry) {
    super();
  }

  async process(job: Job): Promise<void> {
    const handler = this.handlerRegistry.getHandler(job.name);
    if (!handler) {
      this.logger.warn(`No handler registered for event: ${job.name}`);
      return;
    }
    await handler.handle(job.name, job.data);
    this.logger.log(`Processed: ${job.name} | jobId: ${job.id}`);
  }
}
