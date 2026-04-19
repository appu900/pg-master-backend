import { Module } from '@nestjs/common';
import { MetricsWorker } from './metrics.worker';

@Module({
  imports: [],
  controllers: [],
  providers: [MetricsWorker],
  exports: [],
})
export class WorkerModule {}
