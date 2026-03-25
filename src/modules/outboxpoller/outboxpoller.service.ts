import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OutboxStatus } from '@prisma/client';

export interface CreateTenancyPayload {
  outboxId: number;
  tenantId: number;
  roomId: number;
  propertyId: number;
  joinedAt: Date;
  rentAmount: number;
  securityDeposite: number;
  advanceAmount: number;
  lockInPeriodInMonths: number;
  noticePeriodInDays: number;
  initialElectricityReading: number;
}

@Injectable()
export class OutboxpollerService {
  private readonly logger = new Logger(OutboxpollerService.name);
  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_12_HOURS)
  async cleanDatabase() {
    const deleted = await this.prisma.outBox.deleteMany({
      where: {
        status: OutboxStatus.COMPLETED,
        updatedAt: {
          lt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        },
      },
    });
    this.logger.debug(`Outbox cleanup deleted ${deleted}`);
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async PoolNewTenancy() {}
}
