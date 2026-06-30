import { Module } from '@nestjs/common';
import { ElectricityModule } from '../modules/electricity/electricity.module';
import { ElectricityBillingWorker } from './electricity-billing.worker';
import { MetricsWorker } from './metrics.worker';
import { NotificationWorker } from './notification.worker';

@Module({
  imports: [ElectricityModule],
  controllers: [],
  providers: [MetricsWorker, ElectricityBillingWorker, NotificationWorker],
  exports: [],
})
export class WorkerModule {}
