import { Module } from '@nestjs/common';
import { ElectricityController } from './electricity.controller';
import { ElectricityService } from './electricity.service';
import { ElectricityEvents } from './electricity.events';

@Module({
  controllers: [ElectricityController],
  providers: [ElectricityService,ElectricityEvents],
  exports: [ElectricityService],
})
export class ElectricityModule {}
