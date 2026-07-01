
import {Injectable, Logger} from '@nestjs/common'
import { PrismaService } from 'src/infra/Database/prisma/prisma.service'


@Injectable()
export class Reminderservice{
  private readonly logger = new Logger(Reminderservice.name)
  constructor(private readonly prisma:PrismaService) { }


  async sendBulkReminderForPendingDue(propertyId: number) {
    
  }
}