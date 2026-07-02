import { Module } from '@nestjs/common';
import { PropertyMatricsController } from './propertymatrics.controller';
import { PropertyMatricsService } from './propertymatrics.service';
import { PropertyMetricsListner } from './propertymatrics.listner';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [StaffModule],
  controllers: [PropertyMatricsController],
  providers: [PropertyMatricsService,PropertyMetricsListner],
  exports: [],
})
export class PropertyMatricsModule {}
