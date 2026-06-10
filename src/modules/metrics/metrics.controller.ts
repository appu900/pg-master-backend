import { Controller, Logger,Get,Param, ParseIntPipe } from "@nestjs/common";
import { MetricsService } from "./metrics.service";

@Controller('metrics')
export class MetricsController{
  private readonly logger = new Logger(MetricsController.name)
  constructor(private readonly metricsService:MetricsService){}

  @Get(':propertyId')
  async getPropertyMetrics(@Param('propertyId',ParseIntPipe) propertyId:number){
      return this.metricsService.getPropertyMetrics(propertyId)
  }
}