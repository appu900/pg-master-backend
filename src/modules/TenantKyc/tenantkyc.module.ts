import { StaffModule } from '../staff/staff.module';
import { Module } from '@nestjs/common';
import { TenantKycService } from './tenantKyc.service';
import { TenantKycController } from './tenantkyc.controller';
import { DigilockerController } from './adapters/cashfree.digilocker.controller';
import { CashfreeVerificationService} from './adapters/cashfree.digilocker.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule, StaffModule],
  controllers: [TenantKycController,DigilockerController],
  providers: [TenantKycService,CashfreeVerificationService],
  exports: [TenantKycService],
})
export class TenantKycModule {}
