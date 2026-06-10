



import { Module } from "@nestjs/common"
import { SettlementController } from "./settelment.controller";
import { SettleMentService } from "./settelment.service";




@Module({
  imports: [],
  controllers: [SettlementController],
  providers: [SettleMentService],
  exports: [],
})
export class SettelmentModule{}