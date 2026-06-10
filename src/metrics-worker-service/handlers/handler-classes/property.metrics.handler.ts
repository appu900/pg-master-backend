import { Logger, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { RedisService } from 'src/infra/redis/redis.service';
import { MetricsHandler } from '../interface/metrics.handler.interface';
import { PayloadOf } from 'src/core/events/app.event.payloads';
import { Appevents } from 'src/core/events/app.events';
import { payeeCategory } from '@prisma/client';
import { AppService } from 'src/app.service';
import { GetOwnerKeyForFinanceMetrics, GetOwnerKeyForPropertyMetrics, GetPropertyKeyForOtherMetrics } from 'src/infra/redis/keys/property';
import { pipe } from 'rxjs';

@Injectable()
export class PropertyMetricsHandler implements MetricsHandler {
  private readonly logger = new Logger(PropertyMetricsHandler.name);
  readonly handlerName = 'PROPERTY_METRICS_HANDLER';
  readonly supportedEvents = [Appevents.PROPERTY_CREATED_EVENT];

  private readonly ops: Record<string, (data: any) => Promise<void>> = {
    'property.created': (data) => this.handlePropertyCreated(data),
    'property.deleted': (data) => this.handlePropertyDeleted(data),
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async handle(eventType: string, data: unknown): Promise<void> {
    await this.ops[eventType]?.(data);
  }

  async handlePropertyCreated(data: PayloadOf<'property.created'>) {
    const { propertyId, month, year, ownerId } = data;
    await this.prisma.$transaction(async (tx) => {
      const propertyMetrics = tx.propertyOtherMetrics.create({
        data:{
          propertyId,
          ownerId
        }
      });
      const propertyFinanceMetrics = tx.propertyFinanceMetrics.create({
        data: {
          propertyId,
          ownerId,
          month,
          year
        }
      })
    });
    const pipeline = this.redis.getClient().pipeline()
    const key = GetOwnerKeyForPropertyMetrics(ownerId)
    pipeline.hincrby(key, 'total_property_count', 1)
    await pipeline.exec();
    this.logger.debug(`cacahed the data for metrics with propertyId and ownerId ${propertyId}:${ownerId}`)
  }
  
  async handlePropertyDeleted(data: PayloadOf<'property.deleted'>) {}
}
