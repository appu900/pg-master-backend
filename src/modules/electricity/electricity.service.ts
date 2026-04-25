import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenancyStatus } from '@prisma/client';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { SubmitMainMeterDto } from './dto/submit.mainmeter.dto';
import { Decimal } from '@prisma/client/runtime/library';


@Injectable()
export class ElectricityService {
  constructor(private readonly prisma: PrismaService) {}



  async updateMeterReadingData(propertyId:number,month:number,year:number){
     const property = await this.prisma.property.findUnique({where:{id:propertyId}})
     if(!property) throw new BadRequestException("Property not found")
     
     
  }

  async getMeterReadingPageData(propertyId:number,month:number,year:number){
    const property = await this.prisma.property.findUnique({
      where:{id:propertyId},
      select:{id:true,name:true,ownerId:true}
    })
      
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
        where:{propertyId,hasMeter:true},
        select:{id:true,roomNumber:true,floorNumber:true}
      })
    ]);
    return {mainMeter,roomReadings,billingRun}
  }
}
