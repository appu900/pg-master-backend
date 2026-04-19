import { Inject, Logger, Injectable } from '@nestjs/common';
import { IQueueProducer, QUEUE_PRODUCER } from '../ports/queue-producer.port';
import { OnEvent } from '@nestjs/event-emitter';
import { RoomCreatedEvent } from '../events/metrics.events';
import { QUEUES } from '../queue/queue.constants';
import { PropertyCreateEvent } from '../events/property-events';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';

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
}
