import { Logger,Injectable } from "@nestjs/common";
import { PrismaService } from "src/infra/Database/prisma/prisma.service";
import { RedisService } from "src/infra/redis/redis.service";

@Injectable()
export class MetricsService{
  private readonly logger = new Logger(MetricsService.name)
  constructor(private readonly prisma:PrismaService,private readonly redis:RedisService){}

  private getMonthAndYear(){
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear
    return {
      currentMonth,
      currentYear,
      previousMonth,
      previousYear
    }
  }

  // ** this one is for fallback if cache is not there 
  private async fetchFromDB(propertyId:number,currentMonth:number,currentYear:number,previousMonth:number,previousYear:number){
    const[propertyFinancePropertyMetricsCurrent,propertyPreviousMonthMetrics,propertyOtherMetrics] = await Promise.all([
      await this.prisma.propertyFinanceMetrics.findFirst({
        where:{
          propertyId:propertyId,
          month:currentMonth,
          year:currentYear
        }
      }),
      await this.prisma.propertyFinanceMetrics.findFirst({
        where:{
          propertyId,
          month:previousMonth,
          year:currentMonth
        }
      }),
      await this.prisma.propertyOtherMetrics.findFirst({
        where:{
          propertyId,
        }
      })
    ])
    return {
      propertyFinancePropertyMetricsCurrent,
      propertyPreviousMonthMetrics,
      propertyOtherMetrics
    }
  }


  async getPropertyMetrics(propertyId:number){
     const {currentMonth,currentYear,previousMonth,previousYear} = this.getMonthAndYear()
     const currentMonthKey = ``
     const previousMonthKey = ``

     // ** fetch from redis 


     // ** fallback from redis so calling the DB
     const result = await this.fetchFromDB(propertyId,currentYear,currentMonth,previousMonth,previousYear)
     return {
        "message":"fetched from the server",
        result
     }
  }
}