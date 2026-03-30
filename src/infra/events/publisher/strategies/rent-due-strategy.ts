import { IQueueService, QUEUE_SERVICE } from 'src/infra/queue/queue.interface';
import { DOMAIN_EVENTS } from '../../domain-events';
import { EventEnvelope, IEventStrategy } from './event-strategy.interface';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { RentDueCreatePayload } from 'src/common/payload/rent-due-payload';
import { BILLING_JOBS, QUEUES } from 'src/infra/queue/queue.constants';

@Injectable()
export class RentDueEventStrategy implements IEventStrategy<RentDueCreatePayload> {
  private readonly logger = new Logger(RentDueEventStrategy.name);
  readonly supports = [DOMAIN_EVENTS.DAILY_REMINDER_ENQUEUE] as const;
  constructor(@Inject(QUEUE_SERVICE) private readonly queue: IQueueService) {}
  resolve(_eventName: string, payload: unknown): EventEnvelope {
    const { tenancyId, propertyId, month, year } =
      payload as RentDueCreatePayload;
    return {
      queue: QUEUES.BILLING,
      jobName: BILLING_JOBS.UPDATE_METRICS,
      data: { tenancyId, propertyId, month, year },
    };
  }
}
