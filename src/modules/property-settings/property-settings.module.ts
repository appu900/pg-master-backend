import { Module } from '@nestjs/common';
import { StaffModule } from '../staff/staff.module';
import { PropertySettingsController } from './property-settings.controller';
import { PropertySettingsService } from './property-settings.service';

@Module({
  imports: [StaffModule],
  controllers: [PropertySettingsController],
  providers: [PropertySettingsService],
})
export class PropertySettingsModule {}
