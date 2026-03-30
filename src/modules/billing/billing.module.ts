




import {Module} from "@nestjs/common"
import { BillingService } from "./billing.service";
import { BillingEventHandler } from "./biiling.eventpublisher";
import { BillingController } from "./billing.controller";



@Module({
  imports: [],
  controllers: [BillingController],
  providers: [BillingService,BillingEventHandler],
  exports: [BillingService],
})
export class BillingModule {}
