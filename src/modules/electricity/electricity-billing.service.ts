import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DueStatus, TenancyStatus } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { DueCreatedEvent } from 'src/core/events/domain-events';
import { nowIST } from 'src/utils/Proration.utils';
import {
  getBillingPeriodDates,
  getTenantDaysInMonth,
  splitAmountEqually,
  TenantElectricityAllocation,
} from './utils/electricity-billing.utils';

export interface RunElectricityBillingPayload {
  propertyId: number;
  month: number;
  year: number;
}

interface AllocationResult {
  allocations: TenantElectricityAllocation[];
  /** sharedPoolUnits after absorbing vacant metered-room units */
  effectiveSharedPoolUnits: number;
  /** total tenant-days used for shared pool distribution */
  poolTenancyDays: number;
  /** units per day for the shared pool calculation */
  perDayRate: number;
}

@Injectable()
export class ElectricityBillingService {
  private readonly logger = new Logger(ElectricityBillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async runBilling(payload: RunElectricityBillingPayload) {
    const { propertyId, month, year } = payload;

    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, name: true },
    });
    if (!property) throw new NotFoundException('Property not found');

    // ── idempotency guard ─────────────────────────────────────────────────
    const existingRun = await this.prisma.electricityBillingRun.findUnique({
      where: { propertyId_month_year: { propertyId, month, year } },
    });
    if (existingRun?.status === 'COMPLETED') {
      this.logger.log(
        `Billing already completed for property ${propertyId} ${month}/${year} — skipping`,
      );
      return { skipped: true, reason: 'ALREADY_COMPLETED' };
    }

    // ── block if dues are already partially/fully paid ────────────────────
    const paidDue = await this.prisma.tenantDue.findFirst({
      where: {
        propertyId,
        month,
        year,
        dueType: 'ELECTRICITY',
        status: { in: [DueStatus.PAID, DueStatus.PARTIAL] },
      },
    });
    if (paidDue) {
      throw new BadRequestException(
        'Cannot regenerate billing — some electricity dues are already collected',
      );
    }

    // ── load all readings ─────────────────────────────────────────────────
    const [mainMeter, roomReadings, rooms] = await Promise.all([
      this.prisma.propertyMeterReading.findUnique({
        where: { propertyId_month_year: { propertyId, month, year } },
      }),
      this.prisma.roomMeterReading.findMany({
        where: { propertyId, month, year },
      }),
      this.prisma.room.findMany({
        where: { propertyId },
        select: { id: true, roomNumber: true, hasMeter: true },
      }),
    ]);

    if (!mainMeter || mainMeter.status !== 'SUBMITTED') {
      throw new BadRequestException('Main meter readings not submitted yet');
    }

    const unitPrice = Number(mainMeter.unitPrice);
    const mainMeterUnits = Number(mainMeter.unitConsumed);
    const meteredRooms = rooms.filter((r) => r.hasMeter);
    const readingByRoomId = new Map(roomReadings.map((r) => [r.roomId, r]));

    // Ensure every metered room has a reading (it should at this point)
    for (const room of meteredRooms) {
      if (!readingByRoomId.has(room.id)) {
        throw new BadRequestException(
          `Missing meter reading for room ${room.roomNumber}`,
        );
      }
    }

    const privateRoomsUnits = roomReadings.reduce(
      (sum, r) => sum + Number(r.unitConsumed),
      0,
    );
    const rawSharedPoolUnits = mainMeterUnits - privateRoomsUnits;
    if (rawSharedPoolUnits < 0) {
      throw new BadRequestException(
        'Room meter units exceed main meter consumption',
      );
    }

    // ── load active tenancies ─────────────────────────────────────────────
    const activeTenancies = await this.prisma.tenancy.findMany({
      where: {
        propertyId,
        tenancyStatus: TenancyStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
        tenentId: true,
        propertyId: true,
        roomId: true,
        joinedAt: true,
        leftAt: true,
        room: {
          select: { id: true, roomNumber: true, hasMeter: true },
        },
      },
    });

    // ── allocate ──────────────────────────────────────────────────────────
    const meteredRoomIds = new Set(meteredRooms.map((r) => r.id));
    const { allocations, effectiveSharedPoolUnits, poolTenancyDays, perDayRate } =
      this.calculateAllocations({
        activeTenancies,
        meteredRoomIds,
        readingByRoomId,
        rawSharedPoolUnits,
        unitPrice,
        month,
        year,
      });

    const { periodStart, periodEnd, dueDate } = getBillingPeriodDates(month, year);

    // ── transactionally delete old unpaid dues and create new ones ────────
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.tenantDue.deleteMany({
        where: {
          propertyId,
          month,
          year,
          dueType: 'ELECTRICITY',
          status: { in: [DueStatus.UNPAID, DueStatus.OVERDUE] },
        },
      });

      const dues = await Promise.all(
        allocations.map((allocation) =>
          tx.tenantDue.create({
            data: {
              tenancyId: allocation.tenancyId,
              propertyId: allocation.propertyId,
              dueType: 'ELECTRICITY',
              title: `Electricity - ${allocation.roomNumber} (${month}/${year})`,
              description:
                `${allocation.source === 'METERED_ROOM' ? 'Room meter' : 'Shared pool'} ` +
                `electricity for ${month}/${year} — ${allocation.units.toFixed(2)} units`,
              month,
              year,
              totalAmount: allocation.amount,
              balanceAmount: allocation.amount,
              periodStart,
              periodEnd,
              dueDate,
            },
          }),
        ),
      );

      const billingRun = await tx.electricityBillingRun.upsert({
        where: { propertyId_month_year: { propertyId, month, year } },
        create: {
          propertyId,
          month,
          year,
          status: 'COMPLETED',
          mainMeterUnits,
          privateRoomsUnits,
          sharedPoolUnits: effectiveSharedPoolUnits,
          unitPrice,
          totalDaysPool: poolTenancyDays > 0 ? poolTenancyDays : null,
          perDayRate: poolTenancyDays > 0 ? perDayRate : null,
          ranAt: nowIST(),
        },
        update: {
          status: 'COMPLETED',
          mainMeterUnits,
          privateRoomsUnits,
          sharedPoolUnits: effectiveSharedPoolUnits,
          unitPrice,
          totalDaysPool: poolTenancyDays > 0 ? poolTenancyDays : null,
          perDayRate: poolTenancyDays > 0 ? perDayRate : null,
          ranAt: nowIST(),
        },
      });

      return { dues, billingRun };
    });

    // ── emit due.created for each due so metrics stay in sync ─────────────
    for (const due of result.dues) {
      this.eventEmitter.emit(
        'due.created',
        new DueCreatedEvent(
          due.id,
          due.tenancyId,
          due.propertyId,
          due.dueType,
          Number(due.totalAmount),
          month,
          year,
        ),
      );
    }

    this.logger.log(
      `Electricity billing completed for property ${propertyId} ${month}/${year} — ` +
        `${result.dues.length} dues created`,
    );

    return {
      skipped: false,
      billingRun: result.billingRun,
      duesCreated: result.dues.length,
      allocations,
    };
  }

  // ─── allocation engine ────────────────────────────────────────────────────

  private calculateAllocations(params: {
    activeTenancies: Array<{
      id: number;
      tenentId: number;
      propertyId: number;
      roomId: number;
      joinedAt: Date;
      leftAt: Date | null;
      room: { id: number; roomNumber: string; hasMeter: boolean };
    }>;
    meteredRoomIds: Set<number>;
    readingByRoomId: Map<number, { unitConsumed: any }>;
    rawSharedPoolUnits: number;
    unitPrice: number;
    month: number;
    year: number;
  }): AllocationResult {
    const {
      activeTenancies,
      meteredRoomIds,
      readingByRoomId,
      rawSharedPoolUnits,
      unitPrice,
      month,
      year,
    } = params;

    const allocations: TenantElectricityAllocation[] = [];

    // ── group tenancies by metered room ───────────────────────────────────
    const tenanciesByMeteredRoom = new Map<number, typeof activeTenancies>();
    for (const tenancy of activeTenancies) {
      if (!meteredRoomIds.has(tenancy.roomId)) continue;
      const list = tenanciesByMeteredRoom.get(tenancy.roomId) ?? [];
      list.push(tenancy);
      tenanciesByMeteredRoom.set(tenancy.roomId, list);
    }

    // ── edge case 1: vacant metered rooms → add units to shared pool ──────
    // If a metered room has no active tenant the electricity cost must still
    // be recovered, so we roll those units into the shared pool.
    let vacantMeteredUnits = 0;
    for (const roomId of meteredRoomIds) {
      const tenancies = tenanciesByMeteredRoom.get(roomId);
      if (!tenancies || tenancies.length === 0) {
        const reading = readingByRoomId.get(roomId);
        if (reading) vacantMeteredUnits += Number(reading.unitConsumed);
      }
    }
    const effectiveSharedPoolUnits = rawSharedPoolUnits + vacantMeteredUnits;

    // ── bill occupied metered rooms ───────────────────────────────────────
    for (const [roomId, tenancies] of tenanciesByMeteredRoom) {
      if (tenancies.length === 0) continue;
      const reading = readingByRoomId.get(roomId);
      if (!reading) continue;

      const units = Number(reading.unitConsumed);
      const roomTotal = Math.ceil(units * unitPrice);
      const splitAmounts = splitAmountEqually(roomTotal, tenancies.length);

      tenancies.forEach((tenancy, idx) => {
        allocations.push({
          tenancyId: tenancy.id,
          propertyId: tenancy.propertyId,
          tenantId: tenancy.tenentId,
          roomId: tenancy.roomId,
          roomNumber: tenancy.room.roomNumber,
          amount: splitAmounts[idx],
          units: units / tenancies.length,
          source: 'METERED_ROOM',
        });
      });
    }

    // ── edge case 2: shared pool distribution ─────────────────────────────
    // Prefer non-metered tenants for pool distribution. If there are none
    // (all rooms have meters), distribute across ALL active tenants instead
    // so the shared-area electricity cost is never lost.
    if (effectiveSharedPoolUnits <= 0) {
      return { allocations, effectiveSharedPoolUnits, poolTenancyDays: 0, perDayRate: 0 };
    }

    const nonMeteredTenancies = activeTenancies.filter(
      (t) => !meteredRoomIds.has(t.roomId),
    );
    const poolTenancies =
      nonMeteredTenancies.length > 0 ? nonMeteredTenancies : activeTenancies;

    if (poolTenancies.length === 0) {
      // No active tenants at all — nothing to allocate to.
      this.logger.warn(
        `Shared pool of ${effectiveSharedPoolUnits} units could not be allocated: no active tenants`,
      );
      return { allocations, effectiveSharedPoolUnits, poolTenancyDays: 0, perDayRate: 0 };
    }

    const dayEntries = poolTenancies
      .map((tenancy) => ({
        tenancy,
        days: getTenantDaysInMonth(tenancy.joinedAt, tenancy.leftAt, month, year),
      }))
      .filter((e) => e.days > 0);

    const poolTenancyDays = dayEntries.reduce((sum, e) => sum + e.days, 0);
    if (poolTenancyDays === 0) {
      return { allocations, effectiveSharedPoolUnits, poolTenancyDays: 0, perDayRate: 0 };
    }

    const perDayRate = effectiveSharedPoolUnits / poolTenancyDays;

    for (const { tenancy, days } of dayEntries) {
      const units = perDayRate * days;
      const amount = Math.ceil(units * unitPrice);
      if (amount <= 0) continue;

      allocations.push({
        tenancyId: tenancy.id,
        propertyId: tenancy.propertyId,
        tenantId: tenancy.tenentId,
        roomId: tenancy.roomId,
        roomNumber: tenancy.room.roomNumber,
        amount,
        units,
        source: 'SHARED_POOL',
      });
    }

    return { allocations, effectiveSharedPoolUnits, poolTenancyDays, perDayRate };
  }
}
