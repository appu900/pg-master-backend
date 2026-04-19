import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';

@Injectable()
export class PropertyMetricsListner {
  private logger = new Logger(PropertyMetricsListner.name);
  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('property.created')
  async handlePropertyCreateEvent(payload: { propertyId: number }) {
    console.log('event triggered')
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
  }
}
