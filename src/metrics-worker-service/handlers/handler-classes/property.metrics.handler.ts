import { Logger, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { RedisService } from 'src/infra/redis/redis.service';
import { MetricsHandler } from '../interface/metrics.handler.interface';
import { PayloadOf } from 'src/core/events/app.event.payloads';
import { Appevents } from 'src/core/events/app.events';
import { payeeCategory } from '@prisma/client';
import { AppService } from 'src/app.service';
import { GetPropertyKeyForOtherMetrics } from 'src/infra/redis/keys/property';

@Injectable()
export class PropertyMetricsHandler implements MetricsHandler {
  private readonly logger = new Logger(PropertyMetricsHandler.name);
  readonly handlerName = 'PROPERTY_METRICS_HANDLER';
  readonly supportedEvents = [
    Appevents.PROPERTY_CREATED_EVENT,
    Appevents.ROOM_CREATED_EVENT,
  ];

  private readonly ops: Record<string, (data: any) => Promise<void>> = {
    'property.created': (data) => this.handlePropertyCreated(data),
    'property.deleted': (data) => this.handlePropertyDeleted(data),
    'room.created': (data) => this.handleRoomCreated(data),
  };
   
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async handle(eventType: string, data: unknown): Promise<void> {
    await this.ops[eventType]?.(data);
  }

  private async handlePropertyCreated(data: PayloadOf<'property.created'>) {
    console.log('data recived', data);
    await this.generateAMatricsRawForProperty(
      data.propertyId,
      data.ownerId,
      data.month,
      data.year,
    );
    const key = GetPropertyKeyForOtherMetrics(data.propertyId);
    const p = this.redis.getClient().pipeline();
    p.hincrby(key, 'property', 1);
    const pipelineResult = await p.exec();
    console.log('pipeline result', pipelineResult);
    this.logger.debug(
      `property.created metrics updated for propertyId ${data.propertyId}`,
    );
  }

  private async handlePropertyDeleted(data: PayloadOf<'property.deleted'>) {
    const key = `owner:${data.ownerId}:propertyCount`;
    const p = this.redis.getClient().pipeline();
    p.hincrby(key, 'property', -1);
    await p.exec();
    this.logger.debug(
      `property.deleted metrics updated for propertyId ${data.propertyId}`,
    );
  }

  private async handleRoomCreated(data: PayloadOf<'room.created'>) {
    await this.prisma.propertyOtherMetrics.update({
      where: { propertyId: data.propertyId },
      data: {
        totalBeds: {
          increment: data.bedCount,
        },
        totalRooms: {
          increment: 1,
        },
      },
    });
    
    const key = GetPropertyKeyForOtherMetrics(data.propertyId)
    const p = this.redis.getClient().pipeline();
    p.hincrby(key, 'total_rooms', 1); // this is  total no of rooms in the property, so incrementing by 1 for every new room created
    p.hincrby(key, 'total_beds', data.bedCount); //this is total no of beds in the property, so incrementing by bed count of the new room created
    p.hincrby(key, 'total_vacant_beds', data.bedCount); 
    await p.exec();
    this.logger.debug('handled message sucessfully');
  }

  private async generateAMatricsRawForProperty(
    propertyId: number,
    ownerId: number,
    month: number,
    year: number,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const propertyFinanceMetrics = await tx.propertyFinanceMetrics.create({
        data: {
          propertyId,
          ownerId,
          month,
          year,
        },
      });
      console.log('propertyFinaceMetrics', propertyFinanceMetrics);
      const propertyOthermetrics = await tx.propertyOtherMetrics.create({
        data: {
          propertyId,
          ownerId,
        },
      });
      console.log('property other metrics', propertyOthermetrics);
    });
    console.log('property metrics created for property', propertyId);
  }
}
