
import {Controller, Param, ParseIntPipe,Get} from "@nestjs/common"
import { MetricsService } from "./metrics.service";

@Controller('metrics')
export class MetricsController {
   constructor(private readonly metricsService:MetricsService){}
   @Get('property/:propertyId')
   async getPropertyDashBoardMetrics(@Param('propertyId', ParseIntPipe) propertyId:number){
     const now = new Date();
     const currentMonth = now.getMonth() + 1;
     const currentYear = now.getFullYear();
     const previosMonth = currentMonth === 1 ? 12 : currentMonth - 1;
     const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

     const [currentMonthStats,previosMonthStats] = await Promise.all([
        this.metricsService.getPropertyDashBoard(propertyId,currentMonth,currentYear),
        this.metricsService.getPropertyDashBoard(propertyId,previosMonth,previousYear)
     ])
     return {
        message:"stats fetched sucessfully",
        currentMonthStats,
        previosMonthStats
     }
   }
}