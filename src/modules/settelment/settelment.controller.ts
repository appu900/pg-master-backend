import { Controller, Logger } from "@nestjs/common";
import { SettleMentService } from "./settelment.service";




@Controller('settlement')
export class SettlementController{
  private readonly logger = new Logger(SettlementController.name)
  constructor(private readonly settlementService:SettleMentService){}

}