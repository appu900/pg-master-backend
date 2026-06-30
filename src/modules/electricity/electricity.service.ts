import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TenancyStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { SubmitMainMeterDto } from './dto/submit.mainmeter.dto';
import { SubmitAllReadingsDto } from './dto/submit-all-readings.dto';
import { ElectricityEvents } from './electricity.events';
import { ElectricityBillingService } from './electricity-billing.service';

@Injectable()
export class ElectricityService {
  private readonly logger = new Logger(ElectricityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: ElectricityEvents,
    private readonly electricityBillingService: ElectricityBillingService,
  ) {}

  // ─── helpers ──────────────────────────────────────────────────────────────

  private async verifyOwnership(propertyId: number, ownerUserId: number) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, ownerId: ownerUserId },
      select: { id: true, name: true },
    });
    if (!property) {
      throw new NotFoundException(
        'Property not found or you do not have access',
      );
    }
    return property;
  }

 
  private assertBillingMonthAllowed(month: number, year: number) {
    const istString = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
    });
    const istNow = new Date(istString);
    const currentMonth = istNow.getMonth() + 1;
    const currentYear = istNow.getFullYear();
    const isFuture =
      year > currentYear ||
      (year === currentYear && month > currentMonth);
    if (isFuture) {
      throw new BadRequestException(
        'Meter readings cannot be submitted for future months',
      );
    }
  }


  private async getExpectedPreviousReadings(
    propertyId: number,
    month: number,
    year: number,
  ) {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const [rooms, currentMainMeter, prevMainMeter, currentRoomReadings, prevRoomReadings] =
      await Promise.all([
        this.prisma.room.findMany({
          where: { propertyId, hasMeter: true },
          select: { id: true, intialMeterReading: true },
        }),
        this.prisma.propertyMeterReading.findUnique({
          where: { propertyId_month_year: { propertyId, month, year } },
        }),
        this.prisma.propertyMeterReading.findUnique({
          where: {
            propertyId_month_year: {
              propertyId,
              month: prevMonth,
              year: prevYear,
            },
          },
        }),
        this.prisma.roomMeterReading.findMany({
          where: { propertyId, month, year },
        }),
        this.prisma.roomMeterReading.findMany({
          where: { propertyId, month: prevMonth, year: prevYear },
        }),
      ]);

    const currentRoomMap = new Map(
      currentRoomReadings.map((r) => [r.roomId, r]),
    );
    const prevRoomMap = new Map(prevRoomReadings.map((r) => [r.roomId, r]));

    const mainPreviousReading = currentMainMeter
      ? Number(currentMainMeter.previousReading)
      : Number(prevMainMeter?.currentReading ?? 0);

    const roomPreviousReadings = new Map<number, number>();
    for (const room of rooms) {
      const current = currentRoomMap.get(room.id);
      const prev = prevRoomMap.get(room.id);
      roomPreviousReadings.set(
        room.id,
        Number(
          current?.previousReading ??
            prev?.currentReading ??
            room.intialMeterReading ??
            0,
        ),
      );
    }

    return { mainPreviousReading, roomPreviousReadings };
  }

  // ─── public API ───────────────────────────────────────────────────────────

  async getRoomsWithMeter(propertyId: number, ownerUserId: number) {
    const property = await this.verifyOwnership(propertyId, ownerUserId);

    const rooms = await this.prisma.room.findMany({
      where: { propertyId, hasMeter: true },
      select: {
        id: true,
        roomNumber: true,
        floorNumber: true,
        hasMeter: true,
        lastMeterReading: true,
        meterReadingDate: true,
        intialMeterReading: true,
        sharingType: true,
        totalBeds: true,
        occupiedBeds: true,
        tenants: {
          where: {
            tenancyStatus: TenancyStatus.ACTIVE,
            deletedAt: null,
          },
          select: {
            id: true,
            initialElectricityReading: true,
            tenent: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
              },
            },
          },
        },
      },
      orderBy: { roomNumber: 'asc' },
    });

    return {
      propertyId: property.id,
      propertyName: property.name,
      totalRoomsWithMeter: rooms.length,
      rooms,
    };
  }

  async submitMainMeterReading(
    propertyId: number,
    ownerUserId: number,
    dto: SubmitMainMeterDto,
  ) {
    await this.verifyOwnership(propertyId, ownerUserId);
    this.assertBillingMonthAllowed(dto.month, dto.year);

    const unitConsumed = new Decimal(dto.currentReading).sub(
      new Decimal(dto.previousReading),
    );
    if (unitConsumed.lt(0)) {
      throw new BadRequestException(
        'Current reading must be greater than previous reading',
      );
    }

    const reading = await this.prisma.propertyMeterReading.upsert({
      where: {
        propertyId_month_year: { propertyId, month: dto.month, year: dto.year },
      },
      create: {
        propertyId,
        month: dto.month,
        year: dto.year,
        previousReading: dto.previousReading,
        currentReading: dto.currentReading,
        unitConsumed,
        unitPrice: dto.unitPrice,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      update: {
        previousReading: dto.previousReading,
        currentReading: dto.currentReading,
        unitConsumed,
        unitPrice: dto.unitPrice,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    const billingRun = await this.prisma.electricityBillingRun.findUnique({
      where: {
        propertyId_month_year: { propertyId, month: dto.month, year: dto.year },
      },
    });
    if (billingRun?.status === 'WAITING_MAIN_METER') {
      this.eventBus.emitElectricityReadingCreated({
        propertyId,
        month: dto.month,
        year: dto.year,
      });
    }

    return reading;
  }

  async submitMeterReading(
    propertyId: number,
    ownerUserId: number,
    roomId: number,
    dto: SubmitMainMeterDto,
  ) {
    await this.verifyOwnership(propertyId, ownerUserId);
    this.assertBillingMonthAllowed(dto.month, dto.year);

    const room = await this.prisma.room.findFirst({
      where: { id: roomId, propertyId, hasMeter: true },
    });
    if (!room) {
      throw new BadRequestException('Room not found or has no meter');
    }

    const unitConsumed = new Decimal(dto.currentReading).sub(
      new Decimal(dto.previousReading),
    );
    if (unitConsumed.lt(0)) {
      throw new BadRequestException(
        'Current reading must be greater than previous reading',
      );
    }

    return this.prisma.roomMeterReading.upsert({
      where: {
        roomId_month_year: { roomId, month: dto.month, year: dto.year },
      },
      create: {
        roomId,
        month: dto.month,
        year: dto.year,
        propertyId,
        previousReading: dto.previousReading,
        currentReading: dto.currentReading,
        unitConsumed,
        isSkipped: false,
        submittedAt: new Date(),
      },
      update: {
        previousReading: dto.previousReading,
        currentReading: dto.currentReading,
        unitConsumed,
        isSkipped: false,
        submittedAt: new Date(),
      },
    });
  }

  async getMeterReadingsForMonth(
    propertyId: number,
    ownerUserId: number,
    month: number,
    year: number,
  ) {
    const property = await this.verifyOwnership(propertyId, ownerUserId);

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const [
      rooms,
      currentMainMeter,
      prevMainMeter,
      currentRoomReadings,
      prevRoomReadings,
      billingRun,
      paidDue,
    ] = await Promise.all([
      this.prisma.room.findMany({
        where: { propertyId, hasMeter: true },
        select: {
          id: true,
          roomNumber: true,
          floorNumber: true,
          intialMeterReading: true,
        },
        orderBy: { roomNumber: 'asc' },
      }),
      this.prisma.propertyMeterReading.findUnique({
        where: { propertyId_month_year: { propertyId, month, year } },
      }),
      this.prisma.propertyMeterReading.findUnique({
        where: {
          propertyId_month_year: {
            propertyId,
            month: prevMonth,
            year: prevYear,
          },
        },
      }),
      this.prisma.roomMeterReading.findMany({
        where: { propertyId, month, year },
      }),
      this.prisma.roomMeterReading.findMany({
        where: { propertyId, month: prevMonth, year: prevYear },
      }),
      this.prisma.electricityBillingRun.findUnique({
        where: { propertyId_month_year: { propertyId, month, year } },
        select: { status: true },
      }),
      this.prisma.tenantDue.findFirst({
        where: {
          propertyId,
          month,
          year,
          dueType: 'ELECTRICITY',
          status: { in: ['PAID', 'PARTIAL'] },
        },
        select: { id: true },
      }),
    ]);

    const currentRoomMap = new Map(
      currentRoomReadings.map((reading) => [reading.roomId, reading]),
    );
    const prevRoomMap = new Map(
      prevRoomReadings.map((reading) => [reading.roomId, reading]),
    );

    const mainMeter = currentMainMeter
      ? {
          previousReading: currentMainMeter.previousReading,
          currentReading: currentMainMeter.currentReading,
          unitPrice: currentMainMeter.unitPrice,
          unitConsumed: currentMainMeter.unitConsumed,
          status: currentMainMeter.status,
        }
      : {
          previousReading: prevMainMeter?.currentReading ?? 0,
          currentReading: null,
          unitPrice: null,
          unitConsumed: null,
          status: 'PENDING' as const,
        };

    const roomsData = rooms.map((room) => {
      const current = currentRoomMap.get(room.id);
      const prev = prevRoomMap.get(room.id);
      return {
        roomId: room.id,
        roomNumber: room.roomNumber,
        floorNumber: room.floorNumber,
        previousReading:
          current?.previousReading ??
          prev?.currentReading ??
          room.intialMeterReading ??
          0,
        currentReading: current?.currentReading ?? null,
        unitConsumed: current?.unitConsumed ?? null,
        status: current ? ('SUBMITTED' as const) : ('PENDING' as const),
      };
    });

    return {
      propertyId: property.id,
      propertyName: property.name,
      month,
      year,
      mainMeter,
      rooms: roomsData,
      billingRunStatus: billingRun?.status ?? null,
      canEdit: !paidDue,
    };
  }

  async submitAllReadings(
    propertyId: number,
    ownerUserId: number,
    dto: SubmitAllReadingsDto,
  ) {
    await this.verifyOwnership(propertyId, ownerUserId);
    this.assertBillingMonthAllowed(dto.month, dto.year);

    const { month, year, mainMeter, rooms } = dto;

    // ── previous reading integrity check ──────────────────────────────────
    const expectedReadings = await this.getExpectedPreviousReadings(
      propertyId,
      month,
      year,
    );
    if (
      Number(mainMeter.previousReading) !==
      Number(expectedReadings.mainPreviousReading)
    ) {
      throw new BadRequestException(
        'Main meter previous reading does not match the stored value',
      );
    }

    // ── main meter arithmetic ─────────────────────────────────────────────
    const mainUnitConsumed = new Decimal(mainMeter.currentReading).sub(
      new Decimal(mainMeter.previousReading),
    );
    if (mainUnitConsumed.lt(0)) {
      throw new BadRequestException(
        'Main meter: current reading must be greater than previous reading',
      );
    }
    if (mainMeter.unitPrice <= 0) {
      throw new BadRequestException('Unit price must be greater than 0');
    }

    // ── room completeness + per-room validation ───────────────────────────
    const meteredRooms = await this.prisma.room.findMany({
      where: { propertyId, hasMeter: true },
      select: { id: true, roomNumber: true },
    });

    const submittedRoomIds = new Set(rooms.map((r) => r.roomId));
    const expectedRoomIds = new Set(meteredRooms.map((r) => r.id));

    if (submittedRoomIds.size !== expectedRoomIds.size) {
      throw new BadRequestException(
        'Readings must be submitted for all rooms with meters',
      );
    }

    for (const room of meteredRooms) {
      if (!submittedRoomIds.has(room.id)) {
        throw new BadRequestException(
          `Missing reading for room ${room.roomNumber}`,
        );
      }
    }

    for (const roomReading of rooms) {
      if (!expectedRoomIds.has(roomReading.roomId)) {
        throw new BadRequestException(
          `Room ${roomReading.roomId} does not belong to this property or has no meter`,
        );
      }

      const expectedPrevious = expectedReadings.roomPreviousReadings.get(
        roomReading.roomId,
      );
      if (
        expectedPrevious !== undefined &&
        Number(roomReading.previousReading) !== Number(expectedPrevious)
      ) {
        throw new BadRequestException(
          `Room ${roomReading.roomId}: previous reading does not match the stored value`,
        );
      }

      const unitConsumed = new Decimal(roomReading.currentReading).sub(
        new Decimal(roomReading.previousReading),
      );
      if (unitConsumed.lt(0)) {
        throw new BadRequestException(
          `Room ${roomReading.roomId}: current reading must be greater than previous reading`,
        );
      }
    }

    const totalRoomUnits = rooms.reduce(
      (sum, r) =>
        sum + Number(new Decimal(r.currentReading).sub(new Decimal(r.previousReading))),
      0,
    );
    if (totalRoomUnits > Number(mainUnitConsumed)) {
      throw new BadRequestException(
        'Sum of room meter units cannot exceed main meter units',
      );
    }

    const paidDue = await this.prisma.tenantDue.findFirst({
      where: {
        propertyId,
        month,
        year,
        dueType: 'ELECTRICITY',
        status: { in: ['PAID', 'PARTIAL'] },
      },
    });
    if (paidDue) {
      throw new BadRequestException(
        'Cannot resubmit readings — electricity dues are already collected for this month',
      );
    }

    // ── persist readings ──────────────────────────────────────────────────
    const roomData = rooms.map((r) => ({
      ...r,
      unitConsumed: new Decimal(r.currentReading).sub(
        new Decimal(r.previousReading),
      ),
    }));

    const [mainMeterResult, ...roomResults] = await Promise.all([
      this.prisma.propertyMeterReading.upsert({
        where: { propertyId_month_year: { propertyId, month, year } },
        create: {
          propertyId,
          month,
          year,
          previousReading: mainMeter.previousReading,
          currentReading: mainMeter.currentReading,
          unitConsumed: mainUnitConsumed,
          unitPrice: mainMeter.unitPrice,
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
        update: {
          previousReading: mainMeter.previousReading,
          currentReading: mainMeter.currentReading,
          unitConsumed: mainUnitConsumed,
          unitPrice: mainMeter.unitPrice,
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
      }),
      ...roomData.map(({ roomId, previousReading, currentReading, unitConsumed }) =>
        this.prisma.roomMeterReading.upsert({
          where: { roomId_month_year: { roomId, month, year } },
          create: {
            roomId,
            propertyId,
            month,
            year,
            previousReading,
            currentReading,
            unitConsumed,
            isSkipped: false,
            submittedAt: new Date(),
          },
          update: {
            previousReading,
            currentReading,
            unitConsumed,
            isSkipped: false,
            submittedAt: new Date(),
          },
        }),
      ),
    ]);

    // ── run billing synchronously so dues always generate immediately ─────
    // If billing fails (e.g. transient DB error), we fall back to the
    // queue-based retry so readings are never left without dues.
    try {
      await this.electricityBillingService.runBilling({ propertyId, month, year });
    } catch (billingError: any) {
      this.logger.warn(
        `Sync billing failed for property ${propertyId} ${month}/${year}: ` +
          `${billingError?.message ?? 'unknown error'}. Queuing for retry.`,
      );
      this.eventBus.emitElectricityReadingCreated({ propertyId, month, year });
    }

    return { mainMeter: mainMeterResult, rooms: roomResults };
  }

  async getMeterReadingStatus(
    propertyId: number,
    ownerUserId: number,
    month: number,
    year: number,
  ) {
    await this.verifyOwnership(propertyId, ownerUserId);

    const [mainMeter, roomReadings, billingRun, meteredRooms] =
      await Promise.all([
        this.prisma.propertyMeterReading.findUnique({
          where: { propertyId_month_year: { propertyId, month, year } },
        }),
        this.prisma.roomMeterReading.findMany({
          where: { propertyId, month, year },
          include: {
            room: { select: { roomNumber: true, floorNumber: true } },
          },
        }),
        this.prisma.electricityBillingRun.findUnique({
          where: { propertyId_month_year: { propertyId, month, year } },
        }),
        this.prisma.room.findMany({
          where: { propertyId, hasMeter: true },
          select: { id: true, roomNumber: true, floorNumber: true },
        }),
      ]);

    return { mainMeter, roomReadings, billingRun, meteredRooms };
  }
}
