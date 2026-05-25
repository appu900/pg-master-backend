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
import { Appevents } from '../events/app.events';


@Injectable()
export class MetricsListner {
  private readonly logger = new Logger(MetricsListner.name);
  constructor(
    @Inject(QUEUE_PRODUCER) private readonly queue: IQueueProducer,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent(Appevents.ROOM_CREATED_EVENT)
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

  @OnEvent(Appevents.PROPERTY_CREATED_EVENT)
  async onPropertyCreate(eventPayload: PropertyCreateEvent) {
    await this.queue.enqueue(QUEUES.METRICS, Appevents.PROPERTY_CREATED_EVENT,eventPayload)
    this.logger.log(
      `property matrics created for the property ${eventPayload.propertyId}`,
    );
  }

  @OnEvent(Appevents.TENANT_ADD_EVENTS)
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

  @OnEvent(Appevents.DUE_CREATED_EVENT)
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

  @OnEvent(Appevents.DUE_CREATED_EVENT)
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
