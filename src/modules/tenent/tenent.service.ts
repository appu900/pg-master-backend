import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantStatus, UserRole } from '@prisma/client';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { AddTenantDto } from '../room/dto/add.tenant.dto';
import { RoomService } from '../room/room.service';
import { MoveOutTenantDto } from './dto/move-out-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { S3Service } from 'src/infra/s3/s3.service';

@Injectable()
export class TenentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roomService: RoomService,
    private readonly s3Serice: S3Service,
  ) {}

  async addTenant(roomId: number, dto: AddTenantDto) {
    return this.roomService.addTenant(roomId, dto);
  }

  async getTenantsByRoom(roomId: number) {
    return this.roomService.fetchAllTenantsOfRoom(roomId);
  }

  async getTenantById(tenantId: number) {
    const tenant = await this.prisma.user.findUnique({
      where: { id: tenantId },
      include: {
        tenentProfile: true,
        tenancy: {
          where: {
            deletedAt: null,
          },
          include: {
            room: true,
            property: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async getTenantsByProperty(propertyId: number) {
    const tenancies = await this.prisma.tenancy.findMany({
      where: {
        propertyId: propertyId,
        deletedAt: null,
      },
      include: {
        tenent: {
          include: {
            tenentProfile: true,
          },
        },
        room: {
          select: {
            roomNumber: true,
            floorNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return tenancies.map((tenancy) => ({
      id: tenancy.tenent.id,
      tenancyId: tenancy.id,
      fullName: tenancy.tenent.fullName,
      email: tenancy.tenent.email,
      phoneNumber: tenancy.tenent.phoneNumber,
      roomNumber: tenancy.room.roomNumber,
      floorNumber: tenancy.room.floorNumber,
      rentAmount: tenancy.rentAmount,
      securityDeposit: tenancy.securityDeposit,
      status: tenancy.status,
      joinedAt: tenancy.joinedAt,
      leftAt: tenancy.leftAt,
      profile: tenancy.tenent.tenentProfile,
    }));
  }

  async getTenantStats(propertyId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [statusCounts, todayBookings] = await Promise.all([
      this.prisma.tenancy.groupBy({
        by: ['status'],
        where: {
          propertyId: propertyId,
          deletedAt: null,
        },
        _count: {
          id: true,
        },
      }),

      this.prisma.tenancy.count({
        where: {
          propertyId: propertyId,
          joinedAt: {
            gte: today,
            lt: tomorrow,
          },
          deletedAt: null,
        },
      }),
    ]);

    const totalTenants = statusCounts.reduce(
      (sum, group) => sum + group._count.id,
      0,
    );
    const activeTenants =
      statusCounts.find((group) => group.status === TenantStatus.ACTIVE)?._count
        .id || 0;
    const underNoticeTenants =
      statusCounts.find((group) => group.status === TenantStatus.NOTICE_PERIOD)
        ?._count.id || 0;

    return {
      totalTenants,
      activeTenants,
      underNoticeTenants,
      todayBookings,
      pendingDues: 0,
    };
  }

  async updateTenant(tenantId: number, dto: UpdateTenantDto) {
    const tenant = await this.prisma.user.findUnique({
      where: { id: tenantId },
      include: { tenentProfile: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const updateData: any = {};
    if (dto.fullName) updateData.fullName = dto.fullName;
    if (dto.email) updateData.email = dto.email;

    if (Object.keys(updateData).length > 0) {
      await this.prisma.user.update({
        where: { id: tenantId },
        data: updateData,
      });
    }

    if (tenant.tenentProfile) {
      const profileUpdateData: Record<string, any> = {};
      if (dto.gender !== undefined) profileUpdateData.geneder = dto.gender;
      if (dto.profession !== undefined)
        profileUpdateData.profession = dto.profession;
      if (dto.pinCode !== undefined) profileUpdateData.pinCode = dto.pinCode;
      if (dto.state !== undefined) profileUpdateData.state = dto.state;
      if (dto.address !== undefined) profileUpdateData.Address = dto.address;
      if (dto.profileImage !== undefined)
        profileUpdateData.profileImage = dto.profileImage;

      if (Object.keys(profileUpdateData).length > 0) {
        await this.prisma.tenentProfile.update({
          where: { userId: tenantId },
          data: profileUpdateData as any,
        });
      }
    }

    return this.getTenantById(tenantId);
  }

  async moveTenantOut(tenancyId: number, dto: MoveOutTenantDto) {
    const tenancy = await this.prisma.tenancy.findUnique({
      where: { id: tenancyId },
      include: { room: true },
    });

    if (!tenancy) {
      throw new NotFoundException('Tenancy not found');
    }

    if (tenancy.status === TenantStatus.EXITED) {
      throw new BadRequestException('Tenant has already moved out');
    }

    const moveOutDate = new Date(dto.moveOutDate);

    return this.prisma.$transaction(async (tx) => {
      await tx.tenancy.update({
        where: { id: tenancyId },
        data: {
          status: TenantStatus.EXITED,
          leftAt: moveOutDate,
        },
      });

      await tx.room.update({
        where: { id: tenancy.roomId },
        data: {
          occupiedBeds: {
            decrement: 1,
          },
        },
      });

      return {
        success: true,
        message: 'Tenant moved out successfully',
      };
    });
  }

  async searchTenants(propertyId: number, searchQuery: string) {
    const tenancies = await this.prisma.tenancy.findMany({
      where: {
        propertyId: propertyId,
        deletedAt: null,
        tenent: {
          OR: [
            { fullName: { contains: searchQuery, mode: 'insensitive' } },
            { email: { contains: searchQuery, mode: 'insensitive' } },
            { phoneNumber: { contains: searchQuery } },
          ],
        },
      },
      include: {
        tenent: {
          include: {
            tenentProfile: true,
          },
        },
        room: {
          select: {
            roomNumber: true,
            floorNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return tenancies.map((tenancy) => ({
      id: tenancy.tenent.id,
      tenancyId: tenancy.id,
      fullName: tenancy.tenent.fullName,
      email: tenancy.tenent.email,
      phoneNumber: tenancy.tenent.phoneNumber,
      roomNumber: tenancy.room.roomNumber,
      floorNumber: tenancy.room.floorNumber,
      rentAmount: tenancy.rentAmount,
      securityDeposit: tenancy.securityDeposit,
      status: tenancy.status,
      joinedAt: tenancy.joinedAt,
      leftAt: tenancy.leftAt,
      profile: tenancy.tenent.tenentProfile,
    }));
  }

  // async editProfile(tenantId:number,editProfileDto:UpdateProfileDto,image?:Express.Multer.File[]){
  //    const user = await this.prisma.user.findUnique({where:{id:tenantId},include:{tenentProfile:true}})
  //    if(!user) throw new NotFoundException('user not found');
  //    if(!user.tenentProfile || user.role !== UserRole.TENANT) throw new ForbiddenException();
  //    let updatedData = {};
  //    if(image)
  // }
}
