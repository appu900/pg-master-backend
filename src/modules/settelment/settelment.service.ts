import { Logger,Injectable } from "@nestjs/common";





@Injectable()
export class SettleMentService{
  private readonly logger = new Logger(SettleMentService.name)
  constructor(){}
}