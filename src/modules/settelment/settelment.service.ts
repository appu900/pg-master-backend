import { Logger ,Injectable} from "@nestjs/common";
import { PrismaService } from "src/infra/Database/prisma/prisma.service";





@Injectable()
export class SettelmentService{
  private readonly logger = new Logger(SettelmentService.name);
  constructor(private readonly prisma:PrismaService){}


  async HandleSettelmentwebHook(webhookData:any) {
    const res = await this.prisma.webhookData.create({
      data: {
        data:webhookData
      }
    }) 
  }
}