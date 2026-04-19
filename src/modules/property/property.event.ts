import { Logger, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RoomCreatedEvent } from 'src/core/events/metrics.events';
import { PropertyCreateEvent } from 'src/core/events/property-events';

@Injectable()
export class PropertyEvents {
  private readonly logger = new Logger(PropertyEvents.name);
  constructor(private readonly eventBus: EventEmitter2) {}

  emitCreateRoomEvent(data: {
    roomId: number;
    propertyId: number;
    ownerId: number;
  }) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    this.eventBus.emit(
      'room.created',
      new RoomCreatedEvent(
        data.roomId,
        data.propertyId,
        data.ownerId,
        currentMonth,
        currentYear,
      ),
    );
  }

  emitCreatePropertyEvent(data: {
    propertyId: number;
    ownerId: number;
    year: number;
    month: number;
  }) {
    this.eventBus.emit(
      'property.create',
      new PropertyCreateEvent(
        data.propertyId,
        data.ownerId,
        data.month,
        data.year,
      ),
    );
  }
}
