import { Module } from '@nestjs/common';
import { ElectricityController } from './electricity.controller';
import { ElectricityService } from './electricity.service';

@Module({
  controllers: [ElectricityController],
  providers: [ElectricityService],
  exports: [ElectricityService],
})
export class ElectricityModule {}
