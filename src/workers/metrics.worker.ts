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
    console.log("Metrics worker started")
  }

  async process(job: Job): Promise<any> {
    switch (job.name) {
      case 'room.created':
        await this.handleRoomCreated(job.data);
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
    month: number;
    year: number;
  }) {
    const { roomId, propertyId, ownerId, month, year } = data;
    const ownerKey = ``;
    const propertyKey = `dash:property:${propertyId}:${year}:${month}`;
    const pipeline = this.redis.getClient().pipeline();
    pipeline.hincrby(propertyKey, 'total_rooms', 1);
    pipeline.expire(propertyKey, METRICS_REDIS_TTL);
    await pipeline.exec();
  }
}
