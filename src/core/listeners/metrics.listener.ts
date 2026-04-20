import { Inject, Logger, Injectable } from '@nestjs/common';
import { IQueueProducer, QUEUE_PRODUCER } from '../ports/queue-producer.port';
import { OnEvent } from '@nestjs/event-emitter';
import { RoomCreatedEvent } from '../events/metrics.events';
import { QUEUES } from '../queue/queue.constants';
import { PropertyCreateEvent } from '../events/property-events';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import {
  DueCreatedEvent,
  DuePaymentCollectedEvent,
  TenantAddedEvent,
} from '../events/domain-events';

@Injectable()
export class MetricsListner {
  private readonly logger = new Logger(MetricsListner.name);
  constructor(
    @Inject(QUEUE_PRODUCER) private readonly queue: IQueueProducer,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent('room.created')
  async onRoomCreated(event: RoomCreatedEvent) {
    await this.queue.enqueue(
      QUEUES.METRICS,
      'room.created',
      {
        roomId: event.roomId,
        propertyId: event.propertyId,
        ownerId: event.ownerId,
        bedCount:event.totalBedCount,
        month: event.month,
        year: event.year,
      },
      { jobId: `metrics-room-added-${event.roomId}` },
    );
    console.log(`enqued to room update matrics with roomid ${event.roomId}`)
  }

  @OnEvent('property.create')
  async onPropertyCreate(event: PropertyCreateEvent) {
    await this.prisma.propertyMetrics.create({
      data: {
        propertyId: event.propertyId,
        ownerId: event.ownerId,
        month: event.month,
        year: event.year,
      },
    });
    this.logger.log(
      `property matrics created for the property ${event.propertyId}`,
    );
  }

  @OnEvent('tenant.added')
  async onTenantAdded(event:TenantAddedEvent){
    console.log(event.securityDepositeAmount)
    await this.queue.enqueue(
      QUEUES.METRICS,
      'tenant.added',
      {
        tenantId: event.tenantId,
        propertyId: event.propertyId,
        ownerId: event.ownerId,
        rentAmount: event.rentAmount,
        securityDepositeAmount: event.securityDepositeAmount,
        billingCycleDay: event.billingCycleDay,
        dueDate: event.dueDate,
      },
      { jobId: `metrics-tenant-added-${event.tenantId}` },
    );
    console.log(`enqued to tenant update matrics with tenantid ${event.tenantId}`)
  }

  @OnEvent('due.created')
  async onDueCreated(event: DueCreatedEvent) {
    await this.queue.enqueue(
      QUEUES.METRICS,
      'due.created',
      {
        dueId: event.dueId,
        tenancyId: event.tenancyId,
        propertyId: event.propertyId,
        dueType: event.dueType,
        totalAmount: event.totalAmount,
        month: event.month,
        year: event.year,
      },
      { jobId: `metrics-due-created-${event.dueId}` },
    );
  }

  @OnEvent('due.payment.collected')
  async onDuePaymentCollected(event: DuePaymentCollectedEvent) {
    await this.queue.enqueue(
      QUEUES.METRICS,
      'due.payment.collected',
      {
        dueId: event.dueId,
        propertyId: event.propertyId,
        dueType: event.dueType,
        amountPaid: event.amountPaid,
        month: event.month,
        year: event.year,
      },
      { jobId: `metrics-due-paid-${event.dueId}-${Date.now()}` },
    );
  }
}
