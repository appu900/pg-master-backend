import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { nowIST } from 'src/utils/Proration.utils';

@Injectable()
export class PropertyMetricsListner {
  private logger = new Logger(PropertyMetricsListner.name);
  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('property.created')
  async handlePropertyCreateEvent(payload: { propertyId: number }) {
    console.log('event triggered')
    const istNow = nowIST();
    const currentMonth = istNow.getUTCMonth() + 1;
    const currentYear = istNow.getUTCFullYear();
  }
}
