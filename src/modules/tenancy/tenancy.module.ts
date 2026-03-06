import { Module } from '@nestjs/common';
import { TenancyService } from './tenancy.service';

import { TenancyController } from './tenancy.controller';

@Module({
  imports: [],
  controllers: [TenancyController],
  providers: [TenancyService],
  exports: [TenancyService],
})
export class TenancyModule {}
