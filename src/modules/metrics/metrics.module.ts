import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { RedisModule } from 'src/infra/redis/redis.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [RedisModule, StaffModule],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
