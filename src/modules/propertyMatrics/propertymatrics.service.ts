import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';

@Injectable()
export class PropertyMatricsService {
  private readonly logger = new Logger(PropertyMatricsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async fetchPropertyMatrics(propertyId: number) {
    // const now = new Date();
    // const currentMonth = now.getMonth() + 1;
    // const currentYear = now.getFullYear();

    // let previousMonth = currentMonth - 1;
    // let previousYear = currentYear;
    // if (previousMonth === 0) {
    //   previousMonth = 12;
    //   previousYear = currentYear - 1;
    // }
    // const matrics = await this.prisma.propertyMonthlyMetrics.findMany({
    //   where: {
    //     propertyId,
    //     OR: [
    //       { year: currentYear, month: currentMonth },
    //       { year: previousYear, month: previousMonth },
    //     ],
    //   },
    //   select: {
    //     id: true,
    //     year: true,
    //     month: true,
    //     totalCollected: true,
    //     totalDue: true,
    //     currentDue: true,
    //   },
    //   orderBy: [{ year: 'desc' }, { month: 'desc' }],
    // });
    // const currentMonthMetrics = matrics.find(
    //   (m) => m.year === currentYear && m.month === currentMonth,
    // );
    // const previousMonthMatrics = matrics.find(
    //   (m) => m.year === previousYear && m.month === previousMonth,
    // );
    // return {
    //   currentMonth: currentMonthMetrics || null,
    //   previousMonth: previousMonthMatrics || null,
    // };
  }
}
