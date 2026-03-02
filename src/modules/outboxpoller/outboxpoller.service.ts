import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { SqsService } from 'src/infra/Queue/SQS/sqs.service';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly sqs: SqsService,
  ) {}

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
  async PoolNewTenancy() {
  const rows = await this.prisma.outBox.findMany({
    where: {
      status: OutboxStatus.PENDING,
      messageType: 'CREATE_TENANCY',
    },
    take: 50,
    orderBy: { createdAt: 'asc' },
  });

  if (rows.length === 0) return;

  this.logger.log(`Processing ${rows.length} outbox messages`);

  for (const row of rows) {
    try {
      // Mark as PROCESSING (per message)
      await this.prisma.outBox.update({
        where: { id: row.id },
        data: { status: OutboxStatus.PROCESSING },
      });

      const raw = row.payload as any;

      const payload: CreateTenancyPayload = {
        outboxId: row.id,
        tenantId: raw.tenantId,
        roomId: raw.roomId,
        propertyId: raw.propertyId,
        joinedAt: new Date(raw.joinedAt),
        rentAmount: Number(raw.rentAmount),
        securityDeposite: Number(raw.securityDeposite),
        advanceAmount: Number(raw.advanceAmount),
        lockInPeriodInMonths: Number(raw.lockInPeriodInMonths),
        noticePeriodInDays: Number(raw.noticePeriodInDays),
        initialElectricityReading: Number(raw.initialElectricityReading),
      };

      
      const messageGroupId = `property-${payload.propertyId}`;

      await this.sqs.sendMessage(
        row.messageType as any,
        messageGroupId,
        payload,
        row.id.toString(), // use outbox id for deduplication
      );
      this.logger.log(`Outbox message sent: ${row.id}`);

    } catch (error: any) {
      this.logger.error(
        `Outbox message failed: ${row.id}`,
        error?.stack,
      );

      await this.prisma.outBox.update({
        where: { id: row.id },
        data: {
          status: OutboxStatus.PENDING,
          retryCount: { increment: 1 },
          lastError: error?.message,
        },
      });
    }
  }
}
}
