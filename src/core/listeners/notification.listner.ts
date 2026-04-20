import { Logger, Injectable, Inject } from '@nestjs/common';
import { IQueueProducer, QUEUE_PRODUCER } from '../ports/queue-producer.port';
import { TenantAddedEvent } from '../events/domain-events';
import { OnEvent } from '@nestjs/event-emitter';
import { QUEUES } from '../queue/queue.constants';

@Injectable()
export class NotificationListner {
  private readonly logger = new Logger(NotificationListner.name);
  constructor(@Inject(QUEUE_PRODUCER) private readonly queue: IQueueProducer) {}

  @OnEvent('tenant.added')
  async onTenantAdded(event: TenantAddedEvent) {
    await this.queue.enqueue(
      QUEUES.NOTIFICATION,
      'tenant.added',
      {
        type: 'TENANT_WELCOME',
        phone: '+91' + event.tenantPhone,
        channels: ['whatsapp'],
        data: {
          tenantName: event.tenantName,
          propertyName: event.propertyName,
          appLink: 'https://app.rentpe.com',
          pg_name: event.propertyName,
        },
      },
      {
        jobId: `notification-tenant-added-${event.tenantId}`,
      },
    );
    console.log(`enqued to send welcome notification to tenant with id ${event.tenantId}`)
  }
}
