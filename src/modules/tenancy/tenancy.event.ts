import { Logger, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TenantAddedEvent } from 'src/core/events/domain-events';

export interface TenantAddedEventPayload {
  tenancyId: number;
  tenantId: number;
  propertyId: number;
  ownerId: number;
  roomId: number;
  rentAmount: number;
  securityDepositeAmount: number;
  tenantPhone: string;
  tenantName: string;
  propertyName: string;
  roomNumber: string;
  billingCycleDay: number;
  dueDate: string;
}

@Injectable()
export class TenancyEvents {
  private readonly logger = new Logger(TenancyEvents.name);
  constructor(private readonly eventBus: EventEmitter2) {}

  emitTenancyCreated(data: TenantAddedEventPayload) {
    this.eventBus.emit('tenant.added',new TenantAddedEvent(
      data.tenancyId,
      data.tenantId,
      data.propertyId,
      data.ownerId,
      data.roomId,
      data.rentAmount,
      data.securityDepositeAmount,
      data.tenantPhone,
      data.tenantName,
      data.propertyName,
      data.roomNumber,
      data.billingCycleDay,
      data.dueDate
    ));
  }
}
