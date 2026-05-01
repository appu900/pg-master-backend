import { Logger, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ElectricityReadingCreatedEvent } from 'src/core/events/electricity.events';

export const ELECTRICITY_EVENT_CREATED = 'electricity.created';
@Injectable()
export class ElectricityEvents {
  private readonly logger = new Logger(ElectricityEvents.name);
  constructor(private readonly eventBus: EventEmitter2) {}

  async emitElectricityReadingCreated(data: {
    propertyId: number;
    month: number;
    year: number;
  }) {
    this.eventBus.emit(
      ELECTRICITY_EVENT_CREATED,
      new ElectricityReadingCreatedEvent(
        data.propertyId,
        data.month,
        data.year,
      ),
    );
  }
}
