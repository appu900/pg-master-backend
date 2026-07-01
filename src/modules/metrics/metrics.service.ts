import { Injectable, Logger } from '@nestjs/common';
import { DueStatus, MoveInstatus, Prisma, TenancyStatus } from '@prisma/client';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { RedisService } from 'src/infra/redis/redis.service';
import { nowIST, toLocalDateOnly } from 'src/utils/Proration.utils';

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
    const istNow = nowIST();
    const currentMonth = istNow.getUTCMonth() + 1;
    const currentYear = istNow.getUTCFullYear();
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    return {
      currentMonth,
      currentYear,
      previousMonth,
      previousYear,
    };
  }

  /** All dues for a property — includes exited/moved-out tenants for historical accuracy. */
  private allDuesForPropertyWhere(
    propertyId: number,
    extra?: Prisma.TenantDueWhereInput,
  ): Prisma.TenantDueWhereInput {
    return {
      propertyId,
      ...extra,
    };
  }

  /** Only active tenancies — used for current pending dues and live tenant counts. */
  private activeDuesForPropertyWhere(
    propertyId: number,
    extra?: Prisma.TenantDueWhereInput,
  ): Prisma.TenantDueWhereInput {
    return {
      propertyId,
      tenancy: {
        propertyId,
        deletedAt: null,
      },
      ...extra,
    };
  }

  private async aggregateDuesForMonth(
    propertyId: number,
    month: number,
    year: number,
  ): Promise<FinanceMetricsSnapshot> {
    const allMonthWhere = this.allDuesForPropertyWhere(propertyId, {
      month,
      year,
    });
    const activeMonthWhere = this.activeDuesForPropertyWhere(propertyId, {
      month,
      year,
    });

    const [
      collectedAgg,
      allMonthAgg,
      pendingAgg,
      electricityAgg,
      tenantPaymentCounts,
    ] = await Promise.all([
      this.prisma.duePayment.aggregate({
        where: { propertyId, month, year },
        _sum: { amount: true },
      }),
      this.prisma.tenantDue.aggregate({
        where: allMonthWhere,
        _sum: {
          totalAmount: true,
          paidAmount: true,
          balanceAmount: true,
        },
      }),
      this.prisma.tenantDue.aggregate({
        where: {
          ...activeMonthWhere,
          status: { in: UNPAID_STATUSES },
        },
        _sum: { balanceAmount: true },
      }),
      this.prisma.tenantDue.aggregate({
        where: {
          ...allMonthWhere,
          dueType: 'ELECTRICITY',
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.tenantDue.groupBy({
        by: ['tenancyId'],
        where: activeMonthWhere,
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
      totalDueCollected: Math.round(Number(collectedAgg._sum.amount ?? 0)),
      totalPendingDue: Math.round(Number(pendingAgg._sum.balanceAmount ?? 0)),
      totalSecurityDepositePending: 0,
      totalTenantsPaid: tenantsPaid,
      totalTenantsNotPaid: tenantsNotPaid,
    };
  }

  private async aggregateAllPendingDues(propertyId: number): Promise<number> {
    const agg = await this.prisma.tenantDue.aggregate({
      where: this.activeDuesForPropertyWhere(propertyId, {
        status: { in: UNPAID_STATUSES },
      }),
      _sum: { balanceAmount: true },
    });
    return Number(agg._sum.balanceAmount ?? 0);
  }

  private async aggregateSecurityDepositPending(
    propertyId: number,
  ): Promise<number> {
    const agg = await this.prisma.tenantDue.aggregate({
      where: this.activeDuesForPropertyWhere(propertyId, {
        dueType: 'SECURITY_DEPOSIT',
        status: { in: UNPAID_STATUSES },
        balanceAmount: { gt: 0 },
      }),
      _sum: { balanceAmount: true },
    });
    return Math.round(Number(agg._sum.balanceAmount ?? 0));
  }

  private async aggregateLivePropertyOtherMetrics(propertyId: number) {
    const todayStart = toLocalDateOnly(new Date());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

    const [rooms, noticePeriod, waitingToMoveIn, activeTenants] =
      await Promise.all([
        this.prisma.room.findMany({
          where: { propertyId },
          select: { totalBeds: true, occupiedBeds: true },
        }),
        this.prisma.tenancy.count({
          where: {
            propertyId,
            deletedAt: null,
            tenancyStatus: TenancyStatus.NOTICE_PERIOD,
          },
        }),
        this.prisma.tenancy.count({
          where: {
            propertyId,
            deletedAt: null,
            tenancyStatus: {
              notIn: [TenancyStatus.EXITED, TenancyStatus.EVICTED],
            },
            NOT: {
              moveInTrackers: { some: { status: MoveInstatus.MOVED_IN } },
            },
            OR: [
              { tenancyStatus: TenancyStatus.PENDING },
              {
                joinedAt: { gt: todayStart },
                tenancyStatus: TenancyStatus.ACTIVE,
              },
            ],
          },
        }),
        this.prisma.tenancy.count({
          where: {
            propertyId,
            deletedAt: null,
            tenancyStatus: TenancyStatus.ACTIVE,
            joinedAt: { lte: todayStart },
          },
        }),
      ]);

    const totalBeds = rooms.reduce((sum, room) => sum + room.totalBeds, 0);
    const occupiedBeds = rooms.reduce(
      (sum, room) => sum + room.occupiedBeds,
      0,
    );
    const totalVacantBeds = Math.max(totalBeds - occupiedBeds, 0);

    return {
      totalBeds,
      totalVacantBeds,
      totalRooms: rooms.length,
      totalActiveTenants: activeTenants,
      totalTenantsInNoticePeriod: noticePeriod,
      totalTenantsReadyToMoveIn: waitingToMoveIn,
      totalTenantsReadyToMoveout: noticePeriod,
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
