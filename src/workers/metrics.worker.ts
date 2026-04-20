import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Injectable, OnModuleInit } from '@nestjs/common';
import { Job, QueueEvents } from 'bullmq';
import { pipe } from 'rxjs';
import { QUEUES } from 'src/core/queue/queue.constants';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { RedisService } from 'src/infra/redis/redis.service';

// metrics ttl for 45 days
const METRICS_REDIS_TTL = 60 * 60 * 24 * 45;
@Processor(QUEUES.METRICS, { concurrency: 50 })
@Injectable()
export class MetricsWorker extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(MetricsWorker.name);
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }
  onModuleInit() {
    console.log('Metrics worker started');
  }

  async process(job: Job): Promise<any> {
    switch (job.name) {
      case 'room.created':
        await this.handleRoomCreated(job.data);
        break;
      case 'tenant.added':
        await this.handleTenantAdded(job);
        break;
      case 'due.created':
        await this.handleDueCreated(job.data);
        break;
      case 'due.payment.collected':
        await this.handleDuePaymentCollected(job.data);
        break;
      default:
        this.logger.warn(`Unknown metrics job recived ${job.name}`);
        return;
    }
  }

  private async handleRoomCreated(data: {
    roomId: number;
    propertyId: number;
    ownerId: number;
    bedCount: number;
    month: number;
    year: number;
  }) {
    const { roomId, propertyId, ownerId, bedCount, month, year } = data;
    const ownerKey = ``;
    const propertyKey = `dash:property:${propertyId}:${year}:${month}`;
    const pipeline = this.redis.getClient().pipeline();
    pipeline.hincrby(propertyKey, 'total_rooms', 1);
    pipeline.hincrby(propertyKey, 'total_beds', bedCount);
    pipeline.expire(propertyKey, METRICS_REDIS_TTL);
    await pipeline.exec();
  }

  private async handleTenantAdded(job: Job) {
    const { tenantId, propertyId, ownerId, securityDepositeAmount } = job.data;
    await this.prisma.propertyMetrics.update({
      where: {
        propertyId_month_year: {
          propertyId: propertyId,
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
        },
      },
      data: {
        totalDuesGenerated: { increment: securityDepositeAmount },
        activeTenants: { increment: 1 },
        occupiedBeds: { increment: 1 },
      },
    });
    console.log(securityDepositeAmount + 'security deposit amount');
    const propertyKey = `dash:property:${propertyId}:${new Date().getFullYear()}:${new Date().getMonth() + 1}`;
    const pipeline = this.redis.getClient().pipeline();
    pipeline.hincrby(propertyKey, 'dues_generated', securityDepositeAmount);
    pipeline.hincrby(propertyKey, 'active_tenants', 1);
    pipeline.hincrby(propertyKey, 'occupied_beds', 1);
    pipeline.expire(propertyKey, METRICS_REDIS_TTL);
    await pipeline.exec();
  }

  private async handleDueCreated(data: {
    dueId: number;
    propertyId: number;
    dueType: string;
    totalAmount: number;
    month: number;
    year: number;
  }) {
    const { propertyId, totalAmount, month, year } = data;
    await this.prisma.propertyMetrics.update({
      where: { propertyId_month_year: { propertyId, month, year } },
      data: {
        totalDuesGenerated: { increment: totalAmount },
        totalDuesUnpaid: { increment: totalAmount },
      },
    });
    const propertyKey = `dash:property:${propertyId}:${year}:${month}`;
    const pipeline = this.redis.getClient().pipeline();
    pipeline.hincrbyfloat(propertyKey, 'dues_generated', totalAmount);
    pipeline.hincrbyfloat(propertyKey, 'dues_unpaid', totalAmount);
    pipeline.expire(propertyKey, METRICS_REDIS_TTL);
    await pipeline.exec();
  }

  private async handleDuePaymentCollected(data: {
    dueId: number;
    propertyId: number;
    dueType: string;
    amountPaid: number;
    month: number;
    year: number;
  }) {
    const { propertyId, dueType, amountPaid, month, year } = data;

    const collectedField =
      dueType === 'RENT'
        ? 'totalRentCollected'
        : dueType === 'ELECTRICITY'
          ? 'totalElecCollected'
          : 'totalOtherCollected';

    await this.prisma.propertyMetrics.update({
      where: { propertyId_month_year: { propertyId, month, year } },
      data: {
        totalDuesPaid: { increment: amountPaid },
        totalDuesUnpaid: { decrement: amountPaid },
        [collectedField]: { increment: amountPaid },
      },
    });

    const redisCollectedField =
      dueType === 'RENT'
        ? 'rent_collected'
        : dueType === 'ELECTRICITY'
          ? 'elec_collected'
          : 'other_collected';

    const propertyKey = `dash:property:${propertyId}:${year}:${month}`;
    const pipeline = this.redis.getClient().pipeline();
    pipeline.hincrbyfloat(propertyKey, 'dues_paid', amountPaid);
    pipeline.hincrbyfloat(propertyKey, 'dues_unpaid', -amountPaid);
    pipeline.hincrbyfloat(propertyKey, redisCollectedField, amountPaid);
    pipeline.expire(propertyKey, METRICS_REDIS_TTL);
    await pipeline.exec();
  }
}
