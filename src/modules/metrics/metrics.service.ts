import { Injectable, Logger } from '@nestjs/common';
import { DueStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { RedisService } from 'src/infra/redis/redis.service';

const UNPAID_STATUSES: DueStatus[] = [
  DueStatus.UNPAID,
  DueStatus.PARTIAL,
  DueStatus.OVERDUE,
];

type FinanceMetricsSnapshot = {
  propertyId: number;
  month: number;
  year: number;
  totalDueGenerated: number;
  totalElectricityDueGenerated: number;
  totalDueCollected: number;
  totalPendingDue: number;
  totalSecurityDepositePending: number;
  totalTenantsPaid: number;
  totalTenantsNotPaid: number;
};

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private getMonthAndYear() {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    return {
      currentMonth,
      currentYear,
      previousMonth,
      previousYear,
    };
  }

  private async aggregateDuesForMonth(
    propertyId: number,
    month: number,
    year: number,
  ): Promise<FinanceMetricsSnapshot> {
    const baseWhere: Prisma.TenantDueWhereInput = {
      propertyId,
      month,
      year,
    };

    const [allMonthAgg, pendingAgg, electricityAgg, tenantPaymentCounts] =
      await Promise.all([
        this.prisma.tenantDue.aggregate({
          where: baseWhere,
          _sum: {
            totalAmount: true,
            paidAmount: true,
            balanceAmount: true,
          },
        }),
        this.prisma.tenantDue.aggregate({
          where: {
            ...baseWhere,
            status: { in: UNPAID_STATUSES },
          },
          _sum: { balanceAmount: true },
        }),
        this.prisma.tenantDue.aggregate({
          where: {
            ...baseWhere,
            dueType: 'ELECTRICITY',
          },
          _sum: { totalAmount: true },
        }),
        this.prisma.tenantDue.groupBy({
          by: ['tenancyId'],
          where: baseWhere,
          _sum: { balanceAmount: true, paidAmount: true },
        }),
      ]);

    let tenantsPaid = 0;
    let tenantsNotPaid = 0;
    for (const row of tenantPaymentCounts) {
      const balance = Number(row._sum.balanceAmount ?? 0);
      const paid = Number(row._sum.paidAmount ?? 0);
      if (balance > 0) tenantsNotPaid += 1;
      else if (paid > 0) tenantsPaid += 1;
    }

    return {
      propertyId,
      month,
      year,
      totalDueGenerated: Math.round(Number(allMonthAgg._sum.totalAmount ?? 0)),
      totalElectricityDueGenerated: Math.round(
        Number(electricityAgg._sum.totalAmount ?? 0),
      ),
      totalDueCollected: Math.round(Number(allMonthAgg._sum.paidAmount ?? 0)),
      totalPendingDue: Math.round(Number(pendingAgg._sum.balanceAmount ?? 0)),
      totalSecurityDepositePending: 0,
      totalTenantsPaid: tenantsPaid,
      totalTenantsNotPaid: tenantsNotPaid,
    };
  }

  private async aggregateAllPendingDues(propertyId: number): Promise<number> {
    const agg = await this.prisma.tenantDue.aggregate({
      where: {
        propertyId,
        status: { in: UNPAID_STATUSES },
      },
      _sum: { balanceAmount: true },
    });
    return Number(agg._sum.balanceAmount ?? 0);
  }

  private async aggregateSecurityDepositPending(
    propertyId: number,
  ): Promise<number> {
    const agg = await this.prisma.tenantDue.aggregate({
      where: {
        propertyId,
        dueType: 'SECURITY_DEPOSIT',
        status: { in: UNPAID_STATUSES },
        balanceAmount: { gt: 0 },
      },
      _sum: { balanceAmount: true },
    });
    return Math.round(Number(agg._sum.balanceAmount ?? 0));
  }

  private async aggregateLivePropertyOtherMetrics(propertyId: number) {
    const [rooms, statusCounts] = await Promise.all([
      this.prisma.room.findMany({
        where: { propertyId },
        select: { totalBeds: true, occupiedBeds: true },
      }),
      this.prisma.tenancy.groupBy({
        by: ['tenancyStatus'],
        where: { propertyId, deletedAt: null },
        _count: { id: true },
      }),
    ]);

    const totalBeds = rooms.reduce((sum, room) => sum + room.totalBeds, 0);
    const occupiedBeds = rooms.reduce(
      (sum, room) => sum + room.occupiedBeds,
      0,
    );
    const totalVacantBeds = Math.max(totalBeds - occupiedBeds, 0);
    const countByStatus = (status: string) =>
      statusCounts.find((group) => group.tenancyStatus === status)?._count.id ??
      0;

    return {
      totalBeds,
      totalVacantBeds,
      totalRooms: rooms.length,
      totalActiveTenants: countByStatus('ACTIVE'),
      totalTenantsInNoticePeriod: countByStatus('NOTICE_PERIOD'),
      totalTenantsReadyToMoveIn: countByStatus('PENDING'),
      totalTenantsReadyToMoveout: countByStatus('NOTICE_PERIOD'),
    };
  }

  private async fetchFromDB(
    propertyId: number,
    currentMonth: number,
    currentYear: number,
    previousMonth: number,
    previousYear: number,
  ) {
    const [
      propertyFinancePropertyMetricsCurrent,
      propertyPreviousMonthMetrics,
      propertyOtherMetrics,
      totalAllPendingDue,
      securityDepositPending,
      liveOtherMetrics,
    ] = await Promise.all([
      this.aggregateDuesForMonth(propertyId, currentMonth, currentYear),
      this.aggregateDuesForMonth(propertyId, previousMonth, previousYear),
      this.prisma.propertyOtherMetrics.findFirst({
        where: { propertyId },
      }),
      this.aggregateAllPendingDues(propertyId),
      this.aggregateSecurityDepositPending(propertyId),
      this.aggregateLivePropertyOtherMetrics(propertyId),
    ]);

    propertyFinancePropertyMetricsCurrent.totalSecurityDepositePending =
      securityDepositPending;

    const enrichedPropertyOtherMetrics = {
      ...(propertyOtherMetrics ?? { propertyId }),
      ...liveOtherMetrics,
    };

    return {
      propertyFinancePropertyMetricsCurrent,
      propertyPreviousMonthMetrics,
      propertyOtherMetrics: enrichedPropertyOtherMetrics,
      totalAllPendingDue,
    };
  }

  async getPropertyMetrics(propertyId: number) {
    const { currentMonth, currentYear, previousMonth, previousYear } =
      this.getMonthAndYear();

    const result = await this.fetchFromDB(
      propertyId,
      currentMonth,
      currentYear,
      previousMonth,
      previousYear,
    );

    return {
      message: 'fetched from the server',
      result,
    };
  }
}
