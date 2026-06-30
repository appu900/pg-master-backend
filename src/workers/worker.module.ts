import { Module } from '@nestjs/common';
import { ElectricityModule } from '../modules/electricity/electricity.module';
import { ElectricityBillingWorker } from './electricity-billing.worker';
import { MetricsWorker } from './metrics.worker';

@Module({
  imports: [ElectricityModule],
  controllers: [],
  providers: [MetricsWorker, ElectricityBillingWorker],
  exports: [],
})
export class WorkerModule {}
