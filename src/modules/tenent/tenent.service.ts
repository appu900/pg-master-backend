import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenancyStatus, TenantStatus, UserRole } from '@prisma/client';
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
      status: tenancy.tenancyStatus,
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
        by: ['tenancyStatus'],
        where: {
          propertyId: propertyId,
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
        },
      }),
    ]);

    const totalTenants = statusCounts.reduce(
      (sum, group) => sum + group._count.id,
      0,
    );

    const activeTenants =
      statusCounts.find((group) => group.tenancyStatus === TenancyStatus.ACTIVE)
        ?._count.id || 0;

    const underNoticeTenants =
      statusCounts.find(
        (group) => group.tenancyStatus === TenancyStatus.NOTICE_PERIOD,
      )?._count.id || 0;

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

  async deleteTenant(tenantId: number, ownerUserId: number) {
    const tenant = await this.prisma.user.findFirst({
      where: { id: tenantId, role: UserRole.TENANT, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        tenancy: {
          select: {
            id: true,
            roomId: true,
            propertyId: true,
            tenancyStatus: true,
            property: { select: { ownerId: true, name: true } },
            dues: {
              where: { status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] } },
              select: {
                id: true,
                dueType: true,
                title: true,
                balanceAmount: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    const tenancy = tenant.tenancy;
    if (!tenancy) throw new NotFoundException('No tenancy record found for this tenant');

    if (tenancy.property.ownerId !== ownerUserId) {
      throw new ForbiddenException("You do not own this tenant's property");
    }

    if (
      tenancy.tenancyStatus !== 'ACTIVE' &&
      tenancy.tenancyStatus !== 'NOTICE_PERIOD'
    ) {
      throw new BadRequestException('Tenant is not currently active');
    }

    const pendingDues = tenancy.dues;
    if (pendingDues.length > 0) {
      const totalPending = pendingDues.reduce(
        (sum, d) => sum + Number(d.balanceAmount),
        0,
      );
      throw new BadRequestException({
        message: `Cannot remove ${tenant.fullName} — ${pendingDues.length} pending due(s) totalling ₹${totalPending.toFixed(2)}. Clear all dues before removing the tenant.`,
        pendingDues: pendingDues.map((d) => ({
          dueId: d.id,
          type: d.dueType,
          title: d.title,
          balanceAmount: Number(d.balanceAmount),
          status: d.status,
        })),
        totalPendingAmount: totalPending,
      });
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: tenantId },
        data: { deletedAt: now, isActive: false },
      });

      await tx.tenancy.update({
        where: { id: tenancy.id },
        data: { tenancyStatus: 'EXITED', deletedAt: now, leftAt: now },
      });

      await tx.room.update({
        where: { id: tenancy.roomId },
        data: { occupiedBeds: { decrement: 1 } },
      });

      const curMonth = now.getMonth() + 1;
      const curYear = now.getFullYear();
      await tx.propertyMetrics.updateMany({
        where: { propertyId: tenancy.propertyId, month: curMonth, year: curYear },
        data: { activeTenants: { decrement: 1 }, occupiedBeds: { decrement: 1 } },
      });
    });

    return {
      message: `Tenant ${tenant.fullName} removed successfully`,
      tenantId,
      tenancyId: tenancy.id,
      propertyName: tenancy.property.name,
    };
  }

  async moveTenantOut(tenancyId: number, dto: MoveOutTenantDto) {
    return {
      success: true,
      message: 'Tenant moved out successfully',
    };
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
      status: tenancy.tenancyStatus,
      joinedAt: tenancy.joinedAt,
      leftAt: tenancy.leftAt,
      profile: tenancy.tenent.tenentProfile,
    }));
  }

  async fetchTenancyDetails(tenantId: number) {
    const tenant = await this.prisma.user.findUnique({
      where: { id: tenantId, role: UserRole.TENANT },
      include: {
        tenancy: {
          select: {
            room: {
              select: {
                roomNumber: true,
                floorNumber: true,
              },
            },
            property: {
              select: {
                name: true,
                pinCode: true,
                id: true,
              },
            },
            securityDeposit: true,
            joinedAt: true,
            rentAmount: true,
            lockInPeriodsInMonths: true,
            noticePeriodInDays: true,
          },
        },
      },
    });
    if (!tenant) {
      throw new NotFoundException('No tenancy details found for this tenant');
    }
    return tenant;
  }

  // async editProfile(tenantId:number,editProfileDto:UpdateProfileDto,image?:Express.Multer.File[]){
  //    const user = await this.prisma.user.findUnique({where:{id:tenantId},include:{tenentProfile:true}})
  //    if(!user) throw new NotFoundException('user not found');
  //    if(!user.tenentProfile || user.role !== UserRole.TENANT) throw new ForbiddenException();
  //    let updatedData = {};
  //    if(image)
  // }
}
