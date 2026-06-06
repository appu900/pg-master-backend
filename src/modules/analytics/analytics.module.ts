import { Module } from '@nestjs/common';
import { PropertyController } from '../property/property.controller';
import { PropertyAnalyticsService } from './property/property.analytics.service';
import { RedisModule } from 'src/infra/redis/redis.module';
import { PrismaModule } from 'src/infra/Database/prisma/prisma.module';
import { PropertyAnalyticsController } from './property/propertyAnalytics.controller';
@Module({
  imports: [RedisModule,PrismaModule],
  controllers: [PropertyAnalyticsController],
  providers: [PropertyAnalyticsService],
  exports: [],
})
export class AnalyticsModule {}
