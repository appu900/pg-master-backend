import { Module } from '@nestjs/common';
import { PropertySettingsController } from './property-settings.controller';
import { PropertySettingsService } from './property-settings.service';

@Module({
  controllers: [PropertySettingsController],
  providers: [PropertySettingsService],
})
export class PropertySettingsModule {}
