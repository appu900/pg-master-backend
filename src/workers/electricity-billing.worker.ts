import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES } from 'src/core/queue/queue.constants';
import { ELECTRICITY_EVENT_CREATED } from 'src/modules/electricity/electricity.events';
import {
  ElectricityBillingService,
  RunElectricityBillingPayload,
} from 'src/modules/electricity/electricity-billing.service';

@Processor(QUEUES.ELECTRICITY_BILLINNG, { concurrency: 5 })
@Injectable()
export class ElectricityBillingWorker extends WorkerHost {
  private readonly logger = new Logger(ElectricityBillingWorker.name);

  constructor(
    private readonly electricityBillingService: ElectricityBillingService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    switch (job.name) {
      case ELECTRICITY_EVENT_CREATED:
        return this.handleElectricityBilling(job.data);
      default:
        this.logger.warn(`Unknown electricity billing job: ${job.name}`);
        return;
    }
  }

  private async handleElectricityBilling(data: RunElectricityBillingPayload) {
    this.logger.log(
      `Processing electricity billing for property ${data.propertyId} ${data.month}/${data.year}`,
    );
    return this.electricityBillingService.runBilling(data);
  }
}
