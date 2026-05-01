import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenancyStatus } from '@prisma/client';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { SubmitMainMeterDto } from './dto/submit.mainmeter.dto';
import { SubmitAllReadingsDto } from './dto/submit-all-readings.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { ElectricityEvents } from './electricity.events';

@Injectable()
export class ElectricityService {
  constructor(private readonly prisma: PrismaService,private readonly eventBus:ElectricityEvents ) {}

  async getMeterReadingPageData(
    propertyId: number,
    month: number,
    year: number,
  ) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, name: true, ownerId: true },
    });
  }

  async getRoomsWithMeter(propertyId: number, ownerUserId: number) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, ownerId: ownerUserId },
      select: { id: true, name: true },
    });
    if (!property) throw new NotFoundException('Property not found');

    const rooms = await this.prisma.room.findMany({
      where: {
        propertyId,
        hasMeter: true,
      },
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

  async submitMainMeterReading(propertyId: number, dto: SubmitMainMeterDto) {
    const unitConsumed = new Decimal(dto.currentReading).sub(
      new Decimal(dto.previousReading),
    );
    if (unitConsumed.lt(0)) {
      throw new BadRequestException(
        'current reading must be grater then previous reading',
      );
    }
    const reading = await this.prisma.propertyMeterReading.upsert({
      where: {
        propertyId_month_year: { propertyId, month: dto.month, year: dto.year },
      },
      create: {
        propertyId: propertyId,
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
    // if billing run is waiting for this fire billing run for this
    const billingRun = await this.prisma.electricityBillingRun.findUnique({
      where: {
        propertyId_month_year: { propertyId, month: dto.month, year: dto.year },
      },
    });
    if (billingRun && billingRun.status === 'WAITING_MAIN_METER') {
      // produce command to worker server to start running billing for this one
    }
    return reading;
  }

  async submitMeterReading(
    propertyId: number,
    roomId: number,
    dto: SubmitMainMeterDto,
  ) {
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, propertyId },
    });
    if (!room) throw new BadRequestException('Room not found');
    if (!room.hasMeter) throw new BadRequestException('this room has no meter');
    const unitConsumed = new Decimal(dto.currentReading).sub(
      new Decimal(dto.previousReading),
    );
    if (unitConsumed.lt(0)) {
      throw new BadRequestException(
        'Current reading must be greated then previous reading',
      );
    }

    const reading = await this.prisma.roomMeterReading.upsert({
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
    return reading;
  }

  async getMeterReadingsForMonth(
    propertyId: number,
    month: number,
    year: number,
  ) {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const [
      property,
      rooms,
      currentMainMeter,
      prevMainMeter,
      currentRoomReadings,
      prevRoomReadings,
    ] = await Promise.all([
      this.prisma.property.findUnique({
        where: { id: propertyId },
        select: { id: true, name: true },
      }),
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
    ]);

    if (!property) throw new NotFoundException('Property not found');

    const currentRoomMap = new Map(
      currentRoomReadings.map((r) => [r.roomId, r]),
    );
    const prevRoomMap = new Map(prevRoomReadings.map((r) => [r.roomId, r]));

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
          status: 'PENDING',
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
        status: current ? 'SUBMITTED' : 'PENDING',
      };
    });

    return {
      propertyId: property.id,
      propertyName: property.name,
      month,
      year,
      mainMeter,
      rooms: roomsData,
    };
  }




  // ** currently this is applied to client facing api 
  async submitAllReadings(propertyId: number, dto: SubmitAllReadingsDto) {
    const { month, year, mainMeter, rooms } = dto;

    const mainUnitConsumed = new Decimal(mainMeter.currentReading).sub(
      new Decimal(mainMeter.previousReading),
    );
    if (mainUnitConsumed.lt(0)) {
      throw new BadRequestException(
        'Main meter: current reading must be greater than previous reading',
      );
    }

    const roomData = rooms.map((room) => {
      const unitConsumed = new Decimal(room.currentReading).sub(
        new Decimal(room.previousReading),
      );
      if (unitConsumed.lt(0)) {
        throw new BadRequestException(
          `Room ${room.roomId}: current reading must be greater than previous reading`,
        );
      }
      return { ...room, unitConsumed };
    });

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
      ...roomData.map(
        ({ roomId, previousReading, currentReading, unitConsumed }) =>
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
    // ** send events here 
    this.eventBus.emitElectricityReadingCreated({
      propertyId:propertyId,
      month:month,
      year:year
    })
    return { mainMeter: mainMeterResult, rooms: roomResults };
  }

  async getMeterReadingStatus(propertyId: number, month: number, year: number) {
    const [mainMeter, roomReadings, billingRun] = await Promise.all([
      this.prisma.propertyMeterReading.findUnique({
        where: {
          propertyId_month_year: { propertyId, month, year },
        },
      }),
      this.prisma.roomMeterReading.findMany({
        where: { propertyId, month, year },
        include: { room: { select: { roomNumber: true, floorNumber: true } } },
      }),
      this.prisma.electricityBillingRun.findUnique({
        where: {
          propertyId_month_year: { propertyId, month, year },
        },
      }),
      this.prisma.room.findMany({
        where: { propertyId, hasMeter: true },
        select: { id: true, roomNumber: true, floorNumber: true },
      }),
    ]);
    return { mainMeter, roomReadings, billingRun };
  }
}
