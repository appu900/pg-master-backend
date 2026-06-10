import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/infra/Database/prisma/prisma.module';
import { RedisModule } from 'src/infra/redis/redis.module';
import { MetricsWorkerRunner } from './services/metrics.worker.service';
import { MetricsHandlerRegistry, METRICS_HANDLERS } from './registry/metrics.handler.registry';
import { PropertyMetricsHandler } from './handlers/handler-classes/property.metrics.handler';
import { RoomMetricsHandler } from './handlers/handler-classes/room.metrics.handler';

@Module({
  imports: [RedisModule, PrismaModule],
  providers: [
    MetricsWorkerRunner,
    MetricsHandlerRegistry,
    PropertyMetricsHandler,
    RoomMetricsHandler,
    {
      provide: METRICS_HANDLERS,
      useFactory: (property: PropertyMetricsHandler) => [property],
      inject: [PropertyMetricsHandler],
    },
    {
      provide:METRICS_HANDLERS,
      useFactory:(room:RoomMetricsHandler) => [room],
      inject:[RoomMetricsHandler]
    }
  ],
})
export class MetricsWorkerModule {}
