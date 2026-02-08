import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { TenantStatus, UserRole } from '@prisma/client';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { AddTenantDto } from './dto/add.tenant.dto';

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

      //   normalize and validate dates
      if (!dto.joiningDate || typeof dto.joiningDate !== 'string') {
        throw new BadRequestException('joiningDate is required');
      }

      // Parse YYYY-MM-DD string by appending time to force UTC interpretation
      const joiningDate = new Date(dto.joiningDate + 'T00:00:00.000Z');
      
      if (isNaN(joiningDate.getTime())) {
        throw new BadRequestException('Invalid joiningDate. Expected format: YYYY-MM-DD');
      }

      let moveOutDateObj: Date | null = null;
      if (dto.moveoutDate) {
        moveOutDateObj = new Date(dto.moveoutDate);
        if (isNaN(moveOutDateObj.getTime())) {
          throw new BadRequestException('Invalid moveoutDate');
        }
      }

      //   ** check user already exists or not - check phone and email separately for better errors
      const userByPhone = await tx.user.findFirst({
        where: { phoneNumber: dto.phoneNumber },
        select: {
          id: true,
          role: true,
          email: true,
        },
      });

      const userByEmail = await tx.user.findFirst({
        where: { email: dto.email },
        select: {
          id: true,
          role: true,
          phoneNumber: true,
        },
      });

      // Check if phone number is already used by a different account
      if (userByPhone && userByEmail && userByPhone.id !== userByEmail.id) {
        throw new BadRequestException(
          `Phone number is registered with ${userByPhone.email} and email is registered with ${userByEmail.phoneNumber}. Please use matching credentials.`,
        );
      }

      const tenent = userByPhone || userByEmail;

      //** if exsist check tenent  already has an active tenancy or not */
      if (tenent) {
        // Provide specific error messages based on role
        if (tenent.role !== UserRole.TENANT) {
          if (tenent.role === UserRole.PROPERTY_OWNER) {
            if (userByPhone && userByPhone.id === tenent.id) {
              throw new BadRequestException(
                `Phone number ${dto.phoneNumber} is already registered as a Property Owner. Please use a different phone number.`,
              );
            }
            if (userByEmail && userByEmail.id === tenent.id) {
              throw new BadRequestException(
                `Email ${dto.email} is already registered as a Property Owner. Please use a different email.`,
              );
            }
          }
          throw new BadRequestException(
            `This phone number or email is already registered as ${tenent.role}. Please use different credentials.`,
          );
        }
        
        const existingTenancy = await tx.tenancy.findFirst({
          where: {
            tenentId: tenent.id,
            status: TenantStatus.ACTIVE,
            deletedAt: null,
          },
        });
        if (existingTenancy) {
          throw new ConflictException('This tenant already has an active tenancy in another property');
        }
      }

      // Create new tenant user if doesn't exist
      let finalTenant = tenent;
      if (!finalTenant) {
        //** if not exsist create new user as tenent */
        finalTenant = await tx.user.create({
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
        where: { userId: finalTenant.id },
      });
      if (!existingProfile) {
        await tx.tenentProfile.create({
          data: {
            userId: finalTenant.id,
            geneder: dto.gender,
            profession: dto.profession,
            pinCode: dto.pinCode,
            state: dto.state,
            profileImage: '',
            RentalType: dto.rentalType,
            lockInPeriodsInMonths: dto.lockinPeriodMonths,
            noticePeriodInDays: dto.noticePeriodInDays,
            JoiningDate: joiningDate,
            moveOutDate: moveOutDateObj,
            agreementPeriodinMonths: dto.agreementPeriodMonths,
          },
        });
      } else {
        await tx.tenentProfile.update({
          where: {
            userId: finalTenant.id,
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
            JoiningDate: joiningDate,
            moveOutDate: moveOutDateObj,
            agreementPeriodinMonths: dto.agreementPeriodMonths,
          },
        });
      }

      await tx.tenancy.create({
        data: {
          tenentId: finalTenant.id,
          propertyId: dto.propertyId,
          roomId: roomId,
          rentAmount: dto.rentPrice,
          securityDeposit: dto.securityDeposit,
          lockInPeriodsInMonths: dto.lockinPeriodMonths,
          noticePeriodInDays: dto.noticePeriodInDays,
          joinedAt: joiningDate,
          initialElectricityReading: dto.roomElectricityReading,
          status: TenantStatus.ACTIVE,
        },
      });

   
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
  
      const room = await tx.room.findUnique({ where: { id: roomId } });
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
        throw new BadRequestException('Invalid joiningDate. Expected format: YYYY-MM-DD');
      }

      let moveOutDateObj: Date | null = null;
      if (dto.moveoutDate) {
        moveOutDateObj = new Date(dto.moveoutDate);
        if (isNaN(moveOutDateObj.getTime())) {
          throw new BadRequestException('Invalid moveoutDate');
        }
      }

      //  2. user check validation - check phone and email separately for better error messages
      const userByPhone = await tx.user.findFirst({
        where: { phoneNumber: dto.phoneNumber },
        select: {
          id: true,
          role: true,
          email: true,
          tenancy: {
            where: {
              status: TenantStatus.ACTIVE,
              deletedAt: null,
            },
            select: { id: true },
          },
        },
      });

      const userByEmail = await tx.user.findFirst({
        where: { email: dto.email },
        select: {
          id: true,
          role: true,
          phoneNumber: true,
          tenancy: {
            where: {
              status: TenantStatus.ACTIVE,
              deletedAt: null,
            },
            select: { id: true },
          },
        },
      });

      // Check if phone number is already used by a different account
      if (userByPhone && userByEmail && userByPhone.id !== userByEmail.id) {
        throw new BadRequestException(
          `Phone number is registered with ${userByPhone.email} and email is registered with ${userByEmail.phoneNumber}. Please use matching credentials.`,
        );
      }

      const existingUser = userByPhone || userByEmail;

      let tenant;

      if (existingUser) {
        // Provide specific error messages based on role
        if (existingUser.role !== UserRole.TENANT) {
          if (existingUser.role === UserRole.PROPERTY_OWNER) {
            if (userByPhone && userByPhone.id === existingUser.id) {
              throw new BadRequestException(
                `Phone number ${dto.phoneNumber} is already registered as a Property Owner. Please use a different phone number.`,
              );
            }
            if (userByEmail && userByEmail.id === existingUser.id) {
              throw new BadRequestException(
                `Email ${dto.email} is already registered as a Property Owner. Please use a different email.`,
              );
            }
          }
          throw new BadRequestException(
            `This phone number or email is already registered as ${existingUser.role}. Please use different credentials.`,
          );
        }
        
        if (existingUser.tenancy) {
          throw new ConflictException('This tenant already has an active tenancy in another property');
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
            joinedAt: joiningDate,
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
