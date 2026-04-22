import { Logger, Injectable } from '@nestjs/common';
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
  private readonly logger = new Logger(MetricsService.name);
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
    const roomCount = await this.prisms.room.count({
      where: { propertyId: propertyId },
    });
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
      totalBeds: metrics.totalBeds,
      occupiedBeds: metrics.occupiedBeds,
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

  private calChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  private async writeToRedis(
    redisKey: string,
    data: Omit<DashBoardMetrics, 'source'>,
  ) {
    await this.redis.getClient().hmset(redisKey, {
      rent_collected: String(data.rentCollected),
      elec_collected: String(data.elecCollected),
      other_collected: String(data.otherCollected),
      total_collected: String(data.totalCollected),
      total_expenses: String(data.totalExpenses),
      net_profit: String(data.netProfit),
      dues_generated: String(data.duesGenerated),
      dues_paid: String(data.duesPaid),
      dues_unpaid: String(data.duesUnpaid),
      overdue_count: String(data.overdueCount),
      total_beds: String(data.totalBeds),
      occupied_beds: String(data.occupiedBeds),
      active_tenants: String(data.activeTenants),
      occupancy_rate: String(data.occupancyRate),
      collection_rate: String(data.collectionRate),
    });
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
