import { Logger, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { RedisService } from 'src/infra/redis/redis.service';

@Injectable()
export class PropertyAnalyticsService {
  private readonly logger = new Logger(PropertyAnalyticsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * return current month analytics for a property
   * return previous month analytics for a property
   */
  async getPropertyAnalytics(propertyId: number) {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const currentMonthKey = `dash:property:${propertyId}:${currentYear}:${currentMonth}`;
    const previousMonthKey = `dash:property:${propertyId}:${previousYear}:${previousMonth}`;

    const pipeline = this.redis.getClient().pipeline();
    pipeline.hgetall(currentMonthKey);
    pipeline.hgetall(previousMonthKey);
    const results = await pipeline.exec();
    const [currentMonthData, previousMonthData] = results ?? [null, null];

    return {
      currentMonth: {
        month: currentMonth,
        year: currentYear,
        data: currentMonthData?.[1] ?? {},
      },
      previousMonth: {
        month: previousMonth,
        year: previousYear,
        data: previousMonthData?.[1] ?? {},
      },
    };
  }
}
