import { Module } from '@nestjs/common';
import { TenancyService } from './tenancy.service';
import { TenancyController } from './tenancy.controller';
import { TenancyEvents } from './tenancy.event';
import { TenancyCachingService } from './caching/tenancy.cache.service';

@Module({
  imports: [],
  controllers: [TenancyController],
  providers: [TenancyService,TenancyEvents,TenancyCachingService],
  exports: [TenancyService],
})
export class TenancyModule {}
