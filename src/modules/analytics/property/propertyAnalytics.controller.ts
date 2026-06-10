import { Controller, Get, Logger, Param } from '@nestjs/common';
import { PropertyAnalyticsService } from './property.analytics.service';

@Controller('analytics/property')
export class PropertyAnalyticsController {
  private readonly logger = new Logger(PropertyAnalyticsController.name);
  constructor(
    private readonly propertyAnalyticsService: PropertyAnalyticsService,
  ) {}
 
  @Get('/:id')
  async getPropertyAnalytics(@Param('id') propertyId: number) {
    return this.propertyAnalyticsService.getPropertyAnalytics(propertyId);
  }
}
