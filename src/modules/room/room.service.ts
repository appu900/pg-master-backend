import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TenantStatus, UserRole } from '@prisma/client';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { AddTenantDto } from './dto/add.tenant.dto';
import { TargetObjectKeyFormat$ } from '@aws-sdk/client-s3';

@Injectable()
export class RoomService {
  constructor(private readonly prisma: PrismaService) {}

  async addTenentToRoom(roomId: number, dto: AddTenantDto) {
    return this.prisma.$transaction(async (tx) => {
      //   verifying the room
      const room = await tx.room.findUnique({
        where: { id: roomId, propertyId: dto.propertyId },
      });
      if (!room) throw new NotFoundException('Room not found');

      //   verifying if the room has vacant beds
      if (room.occupiedBeds >= room.totalBeds) {
        throw new BadRequestException('No vacant beds available in this room');
      }

      //   ** check user already exists or not
      let tenent = await tx.user.findFirst({
        where: {
          OR: [{ phoneNumber: dto.phoneNumber }, { email: dto.email }],
        },
      });

      //** if exsist check tenent  already has an active tenancy or not */
      if (tenent) {
        if (tenent.role !== UserRole.TENANT) {
          throw new BadRequestException('User is not registered as tenant');
        }
        const existingTenancy = await tx.tenancy.findFirst({
          where: {
            tenentId: tenent.id,
            status: TenantStatus.ACTIVE,
            deletedAt: null,
          },
        });
        if (existingTenancy) {
          throw new ConflictException('User already has an active tenancy');
        }
      } else {
        //** if not exsist create new user as tenent */
        tenent = await tx.user.create({
          data: {
            email: dto.email,
            phoneNumber: dto.phoneNumber,
            fullName: dto.fullName,
            role: UserRole.TENANT,
          },
        });
      }
      //   ** create tenent profile or update
      const existingProfile = await tx.tenentProfile.findUnique({
        where: { userId: tenent.id },
      });
      if (!existingProfile) {
        await tx.tenentProfile.create({
          data: {
            userId: tenent.id,
            geneder: dto.gender,
            profession: dto.profession,
            pinCode: dto.pinCode,
            state: dto.state,
            profileImage: '',
            RentalType: dto.rentalType,
            lockInPeriodsInMonths: dto.lockinPeriodMonths,
            noticePeriodInDays: dto.noticePeriodInDays,
            JoiningDate: dto.joiningDate,
            moveOutDate: dto.moveoutDate,
            agreementPeriodinMonths: dto.agreementPeriodMonths,
          },
        });
      } else {
        await tx.tenentProfile.update({
          where: {
            userId: tenent.id,
          },
          data: {
            geneder: dto.gender,
            profession: dto.profession,
            pinCode: dto.pinCode,
            state: dto.state,
            profileImage: '',
            RentalType: dto.rentalType,
            lockInPeriodsInMonths: dto.lockinPeriodMonths,
            noticePeriodInDays: dto.noticePeriodInDays,
            JoiningDate: dto.joiningDate,
            moveOutDate: dto.moveoutDate,
            agreementPeriodinMonths: dto.agreementPeriodMonths,
          },
        });
      }

      //   ** create tenancy
      await tx.tenancy.create({
        data: {
          tenentId: tenent.id,
          propertyId: dto.propertyId,
          roomId: roomId,
          rentAmount: dto.rentPrice,
          securityDeposit: dto.securityDeposit,
          lockInPeriodsInMonths: dto.lockinPeriodMonths,
          noticePeriodInDays: dto.noticePeriodInDays,
          joinedAt: dto.joiningDate,
          initialElectricityReading: dto.roomElectricityReading,
          status: TenantStatus.ACTIVE,
        },
      });

      //   ** update the occupied beds in room
      await tx.room.update({
        where: { id: roomId },
        data: {
          occupiedBeds: { increment: 1 },
        },
      });
    });
  }

  async addTenant(roomId: number, dto: AddTenantDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. validation checks
      const room = await tx.room.findUnique({ where: { id: roomId } });
      if (!room) throw new NotFoundException('Room not found');
      if (room.propertyId != dto.propertyId)
        throw new BadRequestException(
          'Room does not belong to specified property',
        );
      if (room.occupiedBeds >= room.totalBeds)
        throw new BadRequestException('No vacant bed available in this room');

      //  2. user check validation
      const existingUser = await tx.user.findFirst({
        where: { OR: [{ email: dto.email }, { phoneNumber: dto.phoneNumber }] },
        select: {
          id: true,
          role: true,
          tenancy: {
            where: {
              status: TenantStatus.ACTIVE,
              deletedAt: null,
            },
            select: { id: true },
          },
        },
      });

      let tenant;

      if (existingUser) {
        if (existingUser.role !== UserRole.TENANT) {
          throw new BadRequestException('User is not registered as tenant');
        }
        if (existingUser.tenancy) {
          throw new ConflictException('User already has an active tenancy');
        }

        tenant = existingUser;
      } else {
        // create a new tenant
        tenant = await tx.user.create({
          data: {
            phoneNumber: dto.phoneNumber,
            email: dto.email,
            fullName: dto.fullName,
            role: UserRole.TENANT,
          },
          select: { id: true },
        });
      }

      // 4 create or update tenant profile
      const tenantProfile = await tx.tenentProfile.upsert({
        where: { userId: tenant.id },
        update: {
          geneder: dto.gender,
          profession: dto.profession,
          pinCode: dto.pinCode,
          state: dto.state,
          RentalType: dto.rentalType,
          lockInPeriodsInMonths: dto.lockinPeriodMonths,
          noticePeriodInDays: dto.noticePeriodInDays,
          JoiningDate: dto.joiningDate,
          moveOutDate: dto.moveoutDate,
          agreementPeriodinMonths: dto.agreementPeriodMonths,
        },
        create: {
          userId: tenant.id,
          geneder: dto.gender,
          profession: dto.profession,
          pinCode: dto.pinCode,
          state: dto.state,
          profileImage: '',
          RentalType: dto.rentalType,
          lockInPeriodsInMonths: dto.lockinPeriodMonths,
          noticePeriodInDays: dto.noticePeriodInDays,
          JoiningDate: dto.joiningDate,
          moveOutDate: dto.moveoutDate,
          agreementPeriodinMonths: dto.agreementPeriodMonths,
        },
      });

      // 5 create tenancy and update room
      const [newTenancy] = await Promise.all([
        // tx1 create tenancy
        tx.tenancy.create({
          data: {
            tenentId: tenant.id,
            roomId: roomId,
            propertyId: dto.propertyId,
            rentAmount: dto.rentPrice,
            securityDeposit: dto.securityDeposit,
            noticePeriodInDays: dto.noticePeriodInDays,
            initialElectricityReading: dto.roomElectricityReading,
            joinedAt: dto.joiningDate,
            lockInPeriodsInMonths: dto.lockinPeriodMonths,
          },
          select: { id: true },
        }),

        // tx2 update room
        tx.room.update({
          where: { id: roomId },
          data: {
            occupiedBeds: { increment: 1 },
          },
        }),
      ]);

      return {
        success: true,
        tenantId: tenant.id,
        tenancyId: newTenancy.id,
        roomId,
      };
    });
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
