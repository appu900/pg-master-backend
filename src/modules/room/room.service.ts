import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  SQSMessageType,
  TenancyStatus,
  TenantStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { AddTenantDto } from './dto/add.tenant.dto';
import { SqsService } from 'src/infra/Queue/SQS/sqs.service';
import { SQS_EVENT_TYPES } from 'src/common/sqs/message-types';

@Injectable()
export class RoomService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sqsService: SqsService,
  ) {}

  async addTenant(roomId: number, dto: AddTenantDto) {
    const res = await this.prisma.$transaction(async (tx) => {
      const [room, existingUser] = await Promise.all([
        tx.room.findUnique({ where: { id: roomId } }),
        tx.user.findFirst({
          where: {
            OR: [{ phoneNumber: dto.phoneNumber }, { email: dto.email }],
          },
          select: {
            id: true,
            role: true,
            email: true,
            phoneNumber: true,
            isActive: true,
            tenancy: {
              where: { status: TenancyStatus.ACTIVE, deletedAt: null },
              select: { id: true },
            },
          },
        }),
      ]);

      // ** user validation
      if (existingUser) {
        if (existingUser.role !== UserRole.TENANT) {
          const conflictedFiled =
            existingUser.phoneNumber === dto.phoneNumber
              ? `Phone number ${dto.phoneNumber}`
              : `Email ${dto.email}`;
          throw new BadRequestException(
            `${conflictedFiled} is already registerd used can not perform with this operation`,
          );
        }
        if (
          existingUser.isActive === true &&
          existingUser.role === UserRole.TENANT
        ) {
          throw new BadRequestException('Can not perform this operation');
        }
        if (existingUser.tenancy) {
          throw new ConflictException(
            'This tenant already has an active tenancy',
          );
        }
      }

      // ** room validation
      if (!room) throw new NotFoundException('Room not found');
      if (room.propertyId != dto.propertyId)
        throw new BadRequestException(
          'Room does not belong to specified property',
        );
      if (room.occupiedBeds >= room.totalBeds)
        throw new BadRequestException('No vacant bed available in this room');

      if (!dto.joiningDate || typeof dto.joiningDate !== 'string') {
        throw new BadRequestException('joiningDate is required');
      }

      const joiningDate = new Date(dto.joiningDate + 'T00:00:00.000Z');

      if (isNaN(joiningDate.getTime())) {
        throw new BadRequestException(
          'Invalid joiningDate. Expected format: YYYY-MM-DD',
        );
      }

      let moveOutDateObj: Date | null = null;
      if (dto.moveoutDate) {
        moveOutDateObj = new Date(dto.moveoutDate);
        if (isNaN(moveOutDateObj.getTime())) {
          throw new BadRequestException('Invalid moveoutDate');
        }
      }

      const tenant =
        existingUser ??
        (await tx.user.create({
          data: {
            phoneNumber: dto.phoneNumber,
            email: dto.email,
            fullName: dto.fullName,
            role: UserRole.TENANT,
          },
          select: { id: true },
        }));

      await Promise.all([
        tx.tenentProfile.upsert({
          where: { userId: tenant.id },
          update: {
            geneder: dto.gender,
            profession: dto.profession,
            pinCode: dto.pinCode,
            state: dto.state,
            Address: dto.address,
            RentalType: dto.rentalType,
            lockInPeriodsInMonths: dto.lockinPeriodMonths,
            noticePeriodInDays: dto.noticePeriodInDays,
            JoiningDate: joiningDate,
            moveOutDate: moveOutDateObj,
            agreementPeriodinMonths: dto.agreementPeriodMonths,
          },
          create: {
            userId: tenant.id,
            geneder: dto.gender,
            profession: dto.profession,
            pinCode: dto.pinCode,
            state: dto.state,
            Address: dto.address,
            profileImage: '',
            RentalType: dto.rentalType,
            lockInPeriodsInMonths: dto.lockinPeriodMonths,
            noticePeriodInDays: dto.noticePeriodInDays,
            JoiningDate: joiningDate,
            moveOutDate: moveOutDateObj,
            agreementPeriodinMonths: dto.agreementPeriodMonths,
          },
        }),
        tx.room.update({
          where: { id: roomId },
          data: { occupiedBeds: { increment: 1 } },
        }),
        tx.outBox.create({
          data: {
            messageType: 'CREATE_TENANCY',
            status: 'PENDING',
            payload: {
              tenantId: tenant.id,
              roomId,
              propertyId: dto.propertyId,
              joinedAt: joiningDate,
              rentPrice: dto.rentPrice,
            },
          },
        }),
      ]);

      return {
        success: true,
        tenantId: tenant.id,
        joiningDate: joiningDate.toISOString(),
        roomId,
      };
    });

    // await this.sqsService.sendEvent({
    //   messageType: SQS_EVENT_TYPES.SEND_WHATSAPP,
    //   payload: {
    //     tenantId: res.tenantId,
    //   },
    // });
    return {
      sucess: true,
    };
  }

  async fetchAllTenantsOfRoom(roomId: number) {
    const tenency = await this.prisma.tenancy.findMany({
      where: { roomId: roomId, status: TenantStatus.ACTIVE, deletedAt: null },
      include: {
        tenent: {
          include: {
            tenentProfile: true,
          },
        },
      },
    });
    return tenency;
  }
}
