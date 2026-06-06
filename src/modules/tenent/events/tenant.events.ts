import { Logger, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TenantDeletedEvent } from '../events-types/tenant.deleted.event.type';

@Injectable()
export class TenantEventPublsiher {
  private readonly logger = new Logger(TenantEventPublsiher.name);
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async publishTenantDeletedEvent(payload: TenantDeletedEvent) {
    {
      this.logger.log(
        `Publishing tenant deleted event for tenantId: ${payload.tenantId} in propertyId: ${payload.propertyId}`,
      );
      this.eventEmitter.emit('tenant.deleted', payload);
      this.logger.log(
        `Tenant deleted event published for tenantId: ${payload.tenantId} in propertyId: ${payload.propertyId}`,
      );
    }
  }
}
