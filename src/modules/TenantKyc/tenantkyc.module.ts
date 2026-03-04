import { Module } from '@nestjs/common';
import { TenantKycService } from './tenantKyc.service';
import { TenantKycController } from './tenantkyc.controller';

@Module({
  imports: [],
  controllers: [TenantKycController],
  providers: [TenantKycService],
  exports: [TenantKycService],
})
export class TenantKycModule {}
