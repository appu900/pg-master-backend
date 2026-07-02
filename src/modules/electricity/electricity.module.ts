import { Module } from '@nestjs/common';
import { ElectricityController } from './electricity.controller';
import { ElectricityService } from './electricity.service';
import { ElectricityEvents } from './electricity.events';
import { ElectricityBillingService } from './electricity-billing.service';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [StaffModule],
  controllers: [ElectricityController],
  providers: [ElectricityService, ElectricityEvents, ElectricityBillingService],
  exports: [ElectricityService, ElectricityBillingService],
})
export class ElectricityModule {}
