import { Injectable } from '@nestjs/common';
import { ComplaintStatus, DueStatus, DueType } from '@prisma/client';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { RedisService } from 'src/infra/redis/redis.service';

export interface DashBoardMetrics {
  source: 'cache' | 'db';
  rentCollected: number;
  elecCollected: number;
  otherCollected: number;
  totalCollected: number;
  totalExpenses: number;
  netProfit: number;
  duesGenerated: number;
  duesPaid: number;
  duesUnpaid: number;
  overdueCount: number;
  totalBeds: number;
  occupiedBeds: number;
  activeTenants: number;
  occupancyRate: number;
  collectionRate: number;
  totalRooms: number;
}

@Injectable()
export class MetricsService {
  constructor(
    private readonly prisms: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getOwnerDashBoard(ownerId: number, month?: number, year?: number) {
    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();

    const redisKey = `dash:${ownerId}:${y}:${m}`;
    const cached = await this.redis.getClient().hgetall(redisKey);
    if (cached && Object.keys(cached).length > 200) {
      return {
        source: 'cache' as const,
        rentCollected: Number(cached.rent_collected || 0),
        elecCollected: Number(cached.elec_collected || 0),
        otherCollected: Number(cached.other_collected || 0),
        totalCollected: Number(cached.total_collected || 0),
        totalExpenses: Number(cached.total_expenses || 0),
        netProfit: Number(cached.net_profit || 0),
        duesGenerated: Number(cached.dues_generated || 0),
        duesPaid: Number(cached.dues_paid || 0),
        duesUnpaid: Number(cached.dues_unpaid || 0),
        overdueCount: Number(cached.overdue_count || 0),
        collectionRate: Number(cached.collection_rate || 0),
        totalBeds: Number(cached.total_beds || 0),
        occupiedBeds: Number(cached.occupied_beds || 0),
        activeTenants: Number(cached.active_tenants || 0),
        occupancyRate: Number(cached.occupancy_rate || 0),
      };
    }

    // database call if not cached we are gonna call this
    const metrics = await this.prisms.propertyMetrics.findMany({
      where: {
        ownerId,
        month: m,
        year: y,
      },
    });
    if (metrics.length === 0) {
      // return the empty metrics here
      return this.emptyMetrics('db', 0);
    }

    // ** agrregate across all owner"s property
    const result = metrics.reduce(
      (acc, metric) => ({
        rentCollected: acc.rentCollected + Number(metric.totalRentCollected),
        elecCollected: acc.elecCollected + Number(metric.totalElecCollected),
        otherCollected: acc.otherCollected + Number(metric.totalOtherCollected),
        totalExpenses: acc.totalExpenses + Number(metric.totalExpenses),
        netProfit: acc.netProfit + Number(metric.netProfit),
        duesGenerated: acc.duesGenerated + Number(metric.totalDuesGenerated),
        duesPaid: acc.duesPaid + Number(metric.totalDuesPaid),
        duesUnpaid: acc.duesUnpaid + Number(metric.totalDuesUnpaid),
        overdueCount: acc.overdueCount + metric.overdueCount,
        totalBeds: acc.totalBeds + metric.totalBeds,
        occupiedBeds: acc.occupiedBeds + metric.occupiedBeds,
        activeTenants: acc.activeTenants + metric.activeTenants,
      }),
      {
        rentCollected: 0,
        elecCollected: 0,
        otherCollected: 0,
        totalExpenses: 0,
        netProfit: 0,
        duesGenerated: 0,
        duesPaid: 0,
        duesUnpaid: 0,
        overdueCount: 0,
        totalBeds: 0,
        occupiedBeds: 0,
        activeTenants: 0,
      },
    );

    const totalCollected =
      result.rentCollected + result.elecCollected + result.otherCollected;
    const occupancyRate =
      result.totalBeds > 0 ? (result.occupiedBeds / result.totalBeds) * 100 : 0;
    const collectionRate =
      result.duesGenerated > 0
        ? (result.duesPaid / result.duesGenerated) * 100
        : 0;
    return {
      source: 'db' as const,
      ...result,
      totalCollected,
      occupancyRate,
      collectionRate,
    };
  }

  //   ** for specific property
  async getPropertyDashBoard(
    propertyId: number,
    month?: number,
    year?: number,
  ) {
    const mon = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();

    const redisKey = `dash:property:${propertyId}:${y}:${mon}`;
    const cached = await this.redis.getClient().hgetall(redisKey);
    console.log('cahed data of property matrics', cached);

    if (cached && Object.keys(cached).length >= 200) {
      return {
        source: 'cache' as const,
        rentCollected: Number(cached.rent_collected || 0),
        elecCollected: Number(cached.elec_collected || 0),
        otherCollected: Number(cached.other_collected || 0),
        totalCollected: Number(cached.total_collected || 0),
        totalExpenses: Number(cached.total_expenses || 0),
        netProfit: Number(cached.net_profit || 0),
        duesGenerated: Number(cached.dues_generated || 0),
        duesPaid: Number(cached.dues_paid || 0),
        duesUnpaid: Number(cached.dues_unpaid || 0),
        overdueCount: Number(cached.overdue_count || 0),
        totalBeds: Number(cached.total_beds),
        occupiedBeds: Number(cached.occupied_beds || 0),
        activeTenants: Number(cached.active_tenants || 0),
        occupancyRate: Number(cached.occupancy_rate || 0),
        totalRooms: Number(cached.total_rooms || 0),
      };
    }

    const metrics = await this.prisms.propertyMetrics.findUnique({
      where: { propertyId_month_year: { propertyId, month: mon, year: y } },
    });
    const result = await this.prisms.room.aggregate({
      where: { propertyId: propertyId },
      _sum: {
        totalBeds: true,
        occupiedBeds: true,
      },
      _count: {
        id: true,
      },
    });
    const totalBeds = result._sum.totalBeds || 0;
    const occupiedBeds = result._sum.occupiedBeds || 0;
    const roomCount = result._count.id || 0;
    if (!metrics) {
      return this.emptyMetrics('db', roomCount);
    }
    return {
      source: 'db' as const,
      rentCollected: Number(metrics.totalRentCollected),
      elecCollected: Number(metrics.totalElecCollected),
      otherCollected: Number(metrics.totalOtherCollected),
      totalCollected:
        Number(metrics.totalRentCollected) +
        Number(metrics.totalElecCollected) +
        Number(metrics.totalOtherCollected),
      totalExpenses: Number(metrics.totalExpenses),
      netProfit: Number(metrics.netProfit),
      duesGenerated: Number(metrics.totalDuesGenerated),
      duesPaid: Number(metrics.totalDuesPaid),
      duesUnpaid: Number(metrics.totalDuesUnpaid),
      overdueCount: metrics.overdueCount,
      totalBeds: totalBeds,
      occupiedBeds: occupiedBeds,
      activeTenants: metrics.activeTenants,
      occupancyRate: Number(metrics.occupancyRate),
      collectionRate: Number(metrics.collectionRate),
      totalRooms: Number(roomCount),
    };
  }

  async getMonthOverMonth(ownerId: number) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const [current, previous] = await Promise.all([
      this.getOwnerDashBoard(ownerId, currentMonth, currentYear),
      this.getOwnerDashBoard(ownerId, prevMonth, prevYear),
    ]);
    return {
      current,
      previous,
      changes: {
        rentCollected: this.calChange(
          current.rentCollected,
          previous.rentCollected,
        ),
        totalExpenses: this.calChange(
          current.totalBeds,
          previous.totalExpenses,
        ),
        collectionRate: current.collectionRate - previous.collectionRate,
        occupamcyRate: current.occupancyRate - previous.occupancyRate,
      },
    };
  }

  // Returns expenses grouped by property + overall total for current and previous month/year
  async getExpensesSummary(ownerId: number) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const properties = await this.prisms.property.findMany({
      where: { ownerId },
      select: { id: true, name: true },
    });
    const propertyIds = properties.map((p) => p.id);
    const propertyMap = new Map(properties.map((p) => [p.id, p.name]));

    const [currentRows, prevRows] = await Promise.all([
      this.prisms.expenses.groupBy({
        by: ['propertyId'],
        where: {
          propertyId: { in: propertyIds },
          month: currentMonth,
          year: currentYear,
        },
        _sum: { amount: true },
      }),
      this.prisms.expenses.groupBy({
        by: ['propertyId'],
        where: {
          propertyId: { in: propertyIds },
          month: prevMonth,
          year: prevYear,
        },
        _sum: { amount: true },
      }),
    ]);

    const mapRows = (rows: typeof currentRows) =>
      rows.map((r) => ({
        propertyId: r.propertyId,
        propertyName: propertyMap.get(r.propertyId) ?? 'Unknown',
        total: Number(r._sum.amount ?? 0),
      }));

    const sumTotal = (rows: typeof currentRows) =>
      rows.reduce((acc, r) => acc + Number(r._sum.amount ?? 0), 0);

    return {
      currentMonth: {
        month: currentMonth,
        year: currentYear,
        byProperty: mapRows(currentRows),
        total: sumTotal(currentRows),
      },
      previousMonth: {
        month: prevMonth,
        year: prevYear,
        byProperty: mapRows(prevRows),
        total: sumTotal(prevRows),
      },
    };
  }

  // Returns total dues and total collection for current and previous month across all owner properties
  async getDuesSummary(ownerId: number) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const properties = await this.prisms.property.findMany({
      where: { ownerId },
      select: { id: true },
    });
    const propertyIds = properties.map((p) => p.id);

    const [currentAgg, prevAgg] = await Promise.all([
      this.prisms.tenantDue.aggregate({
        where: {
          propertyId: { in: propertyIds },
          month: currentMonth,
          year: currentYear,
        },
        _sum: { totalAmount: true, paidAmount: true },
      }),
      this.prisms.tenantDue.aggregate({
        where: {
          propertyId: { in: propertyIds },
          month: prevMonth,
          year: prevYear,
        },
        _sum: { totalAmount: true, paidAmount: true },
      }),
    ]);

    return {
      currentMonth: {
        month: currentMonth,
        year: currentYear,
        totalDues: Number(currentAgg._sum.totalAmount ?? 0),
        totalCollection: Number(currentAgg._sum.paidAmount ?? 0),
      },
      previousMonth: {
        month: prevMonth,
        year: prevYear,
        totalDues: Number(prevAgg._sum.totalAmount ?? 0),
        totalCollection: Number(prevAgg._sum.paidAmount ?? 0),
      },
    };
  }

  // Returns how many tenants paid / did not pay rent for the current month
  async getRentPaymentStatus(ownerId: number) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const properties = await this.prisms.property.findMany({
      where: { ownerId },
      select: { id: true },
    });
    const propertyIds = properties.map((p) => p.id);

    const rentDues = await this.prisms.tenantDue.findMany({
      where: {
        propertyId: { in: propertyIds },
        month: currentMonth,
        year: currentYear,
        dueType: DueType.RENT,
      },
      select: { status: true },
    });

    const paid = rentDues.filter((d) => d.status === DueStatus.PAID).length;
    const notPaid = rentDues.length - paid;

    return {
      month: currentMonth,
      year: currentYear,
      totalTenants: rentDues.length,
      paid,
      notPaid,
      paymentRate:
        rentDues.length > 0
          ? Number(((paid / rentDues.length) * 100).toFixed(2))
          : 0,
    };
  }

  // Returns total, resolved, and unresolved complaint counts for all owner properties
  async getComplaintsSummary(ownerId: number) {
    const properties = await this.prisms.property.findMany({
      where: { ownerId },
      select: { id: true },
    });
    const propertyIds = properties.map((p) => p.id);

    const [total, resolved, open, inProgress] = await Promise.all([
      this.prisms.complaint.count({
        where: { propertyId: { in: propertyIds } },
      }),
      this.prisms.complaint.count({
        where: {
          propertyId: { in: propertyIds },
          status: ComplaintStatus.COMPLETED,
        },
      }),
      this.prisms.complaint.count({
        where: {
          propertyId: { in: propertyIds },
          status: ComplaintStatus.OPEN,
        },
      }),
      this.prisms.complaint.count({
        where: {
          propertyId: { in: propertyIds },
          status: ComplaintStatus.IN_PROGRESS,
        },
      }),
    ]);

    return {
      total,
      resolved,
      unresolved: total - resolved,
      open,
      inProgress,
      resolutionRate:
        total > 0 ? Number(((resolved / total) * 100).toFixed(2)) : 0,
    };
  }

  // Returns pending security deposits for a specific property
  async getSecurityDepositsPending(propertyId: number) {
    const pending = await this.prisms.tenantDue.findMany({
      where: {
        propertyId,
        dueType: DueType.SECURITY_DEPOSIT,
        status: { notIn: [DueStatus.PAID, DueStatus.WAIVED] },
      },
      select: {
        id: true,
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
        status: true,
        tenancy: {
          select: {
            tenent: {
              select: { fullName: true, phoneNumber: true },
            },
          },
        },
      },
    });

    return {
      propertyId,
      pendingCount: pending.length,
      totalPendingAmount: pending.reduce(
        (sum, d) => sum + Number(d.balanceAmount),
        0,
      ),
      deposits: pending.map((d) => ({
        dueId: d.id,
        tenantName: d.tenancy.tenent.fullName,
        tenantPhone: d.tenancy.tenent.phoneNumber,
        totalAmount: Number(d.totalAmount),
        paidAmount: Number(d.paidAmount),
        balanceAmount: Number(d.balanceAmount),
        status: d.status,
      })),
    };
  }

  private calChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  private emptyMetrics(
    source: 'cache' | 'db',
    roomCount: number,
  ): DashBoardMetrics {
    return {
      source,
      rentCollected: 0,
      elecCollected: 0,
      otherCollected: 0,
      totalCollected: 0,
      totalExpenses: 0,
      netProfit: 0,
      duesGenerated: 0,
      duesPaid: 0,
      duesUnpaid: 0,
      overdueCount: 0,
      totalBeds: 0,
      occupiedBeds: 0,
      activeTenants: 0,
      occupancyRate: 0,
      collectionRate: 0,
      totalRooms: roomCount,
    };
  }
}
