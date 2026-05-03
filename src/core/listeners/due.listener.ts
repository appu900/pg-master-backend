import { Logger, Injectable, Inject } from '@nestjs/common';
import {
  TenantAddedEvent,
  DuePaymentCollectedEvent,
} from '../events/domain-events';
import { OnEvent } from '@nestjs/event-emitter';
import { IQueueProducer, QUEUE_PRODUCER } from '../ports/queue-producer.port';
import { QUEUES } from '../queue/queue.constants';
import { ElectricityReadingCreatedEvent } from '../events/electricity.events';
import { ELECTRICITY_EVENT_CREATED } from 'src/modules/electricity/electricity.events';
import { every } from 'rxjs';

@Injectable()
export class DueListner {
  private readonly logger = new Logger(DueListner.name);
  constructor(@Inject(QUEUE_PRODUCER) private readonly queue: IQueueProducer) {}

  @OnEvent('tenant.added')
  async onTenantAddedDue(event: TenantAddedEvent) {
    await this.queue.enqueue(QUEUES.NOTIFICATION, 'due.added', {
      type: 'ADD_DUE_NOTIFY',
      phone: '+91' + event.tenantPhone,
      channels: ['whatsapp'],
      data: {
        tenantName: event.tenantName,
        due_type: 'Security Deposit',
        due_amount: event.securityDepositeAmount,
        due_date: event.dueDate,
        payment_link: 'https://app.rentpe.com',
      },
    });
  }

  @OnEvent('due.payment.collected')
  async onDuePaymentCollected(event: DuePaymentCollectedEvent) {
    await this.queue.enqueue(
      QUEUES.NOTIFICATION,
      'due.payment.collected',
      {
        type: 'PAYMENT_COLLECTED_NOTIFY',
        phone: '+91' + event.tenantPhone,
        channels: ['whatsapp'],
        data: {
          tenantName: event.tenantName,
          due_type: event.dueType,
          amount_paid: event.amountPaid,
          balance_amount: event.balanceAmount,
          payment_mode: event.paymentMode,
          is_fully_paid: event.isFullyPaid,
        },
      },
      { jobId: `payment-collected-${event.dueId}-${Date.now()}` },
    );
  }

  @OnEvent(ELECTRICITY_EVENT_CREATED)
  async onElectricityReadingCreated(event: ElectricityReadingCreatedEvent) {
    await this.queue.enqueue(QUEUES.COMMAND, ELECTRICITY_EVENT_CREATED, {
      payload: {
        propertyId: event.propertyId,
        month: event.mobth,
        year: event.year,
      },
    });
    this.logger.debug(
      `SEND COMMAND TO WORKER SERVER TO GENERATE THE ELECTRICITY WITH PROPERTYiD${event.propertyId}`,
    );
  }
}
