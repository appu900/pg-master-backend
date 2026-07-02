import { StaffModule } from '../staff/staff.module';
import { Module } from '@nestjs/common';
import { PropertyController } from './property.controller';
import { PropertyService } from './property.service';
import { PropertyEvents } from './property.event';
import { PropertyEventPublisher } from './events/services/property.events';
import { PropertyCacheManager } from './cache/services/property.cache';

@Module({
  imports: [StaffModule],
  controllers: [PropertyController],
  providers: [PropertyService,PropertyEvents,PropertyEventPublisher,PropertyCacheManager]
})
export class PropertyModule {}
