import { Logger, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Appevents } from 'src/core/events/app.events';
import { PayloadOf } from 'src/core/events/app.event.payloads';

@Injectable()
export class PropertyEventPublisher {
  private readonly logger = new Logger(PropertyEventPublisher.name);
  constructor(private readonly eventbus: EventEmitter2) {}

  publishPropertyCreated(payload: PayloadOf<typeof Appevents.PROPERTY_CREATED_EVENT>) {
    this.eventbus.emit(Appevents.PROPERTY_CREATED_EVENT, payload);
    this.logger.debug(`emitted property.created for propertyId ${payload.propertyId}`);
  }

  publishRoomCreatedEvent(payload: PayloadOf<typeof Appevents.ROOM_CREATED_EVENT>) {
    this.eventbus.emit(Appevents.ROOM_CREATED_EVENT, payload);
    this.logger.debug(`emitted room.created event for propertyId`,payload.propertyId)
  }
   
}
