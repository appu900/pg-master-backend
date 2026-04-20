import { Module } from '@nestjs/common';
import { TenancyService } from './tenancy.service';

import { TenancyController } from './tenancy.controller';
import { TenancyEvents } from './tenancy.event';

@Module({
  imports: [],
  controllers: [TenancyController],
  providers: [TenancyService,TenancyEvents],
  exports: [TenancyService],
})
export class TenancyModule {}
