import { Logger, Injectable, Inject } from '@nestjs/common';
import { TenantAddedEvent } from '../events/domain-events';
import { OnEvent } from '@nestjs/event-emitter';
import { IQueueProducer, QUEUE_PRODUCER } from '../ports/queue-producer.port';
import { QUEUES } from '../queue/queue.constants';

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
}
