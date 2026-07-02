import { Module } from "@nestjs/common"
import { BillingService } from "./billing.service";
import { BillingEventHandler } from "./biiling.eventpublisher";
import { BillingController } from "./billing.controller";
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [StaffModule],
  controllers: [BillingController],
  providers: [BillingService,BillingEventHandler],
  exports: [BillingService],
})
export class BillingModule {}
