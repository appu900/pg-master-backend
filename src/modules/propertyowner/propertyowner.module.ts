import { Module } from '@nestjs/common';
import { StaffModule } from '../staff/staff.module';
import { PropertyownerController } from './propertyowner.controller';
import { PropertyownerService } from './propertyowner.service';

@Module({
  imports: [StaffModule],
  controllers: [PropertyownerController],
  providers: [PropertyownerService],
})
export class PropertyownerModule {}
