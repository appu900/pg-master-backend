import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MoveInstatus, TenancyStatus, UserRole } from '@prisma/client';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { formatDate, nowIST, toDateOnly, toLocalDateOnly } from 'src/utils/Proration.utils';
import { RoomService } from '../room/room.service';
import { MoveOutTenantDto } from './dto/move-out-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { S3Service } from 'src/infra/s3/s3.service';
import { TenantEventPublsiher } from './events/tenant.events';
import { TenantDeletedEvent } from './events-types/tenant.deleted.event.type';
import { RequestMoveOutDto } from './dto/request-moveout.dto';
import { RequestRoomShiftDto } from './dto/request-room-shift.dto';

@Injectable()
export class TenentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roomService: RoomService,
    private readonly s3Serice: S3Service,
    private readonly serviceEventPublisher:TenantEventPublsiher
  ) {}

  private mapTenancyToListItem(tenancy: {
    id: number;
    rentAmount: any;
    securityDeposit: any;
    tenancyStatus: TenancyStatus;
    joinedAt: Date;
    leftAt: Date | null;
    createdAt: Date;
    moveInTrackers?: { id: number; status: string }[];
    tenent: {
      id: number;
      fullName: string;
      email: string | null;
      phoneNumber: string;
      tenentProfile: any;
    };
    room: {
      roomNumber: string;
      floorNumber: number | null;
    };
  }) {
    return {
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
      joinedAt: formatDate(toLocalDateOnly(tenancy.joinedAt)),
      leftAt: tenancy.leftAt ? formatDate(toDateOnly(tenancy.leftAt)) : null,
      createdAt: tenancy.createdAt.toISOString(),
      hadScheduledMoveIn: (tenancy.moveInTrackers?.length ?? 0) > 0,
      moveInStatus: tenancy.moveInTrackers?.[0]?.status ?? null,
      profile: tenancy.tenent.tenentProfile
        ? {
            ...tenancy.tenent.tenentProfile,
            JoiningDate: formatDate(
              toLocalDateOnly(tenancy.tenent.tenentProfile.JoiningDate),
            ),
          }
        : null,
    };
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
        moveInTrackers: {
          select: { id: true, status: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return tenancies.map((tenancy) => this.mapTenancyToListItem(tenancy));
  }

  async getTenantStats(propertyId: number) {
    const todayStart = toLocalDateOnly(new Date());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

    const [
      todayBookings,
      waitingToMoveIn,
      securityDepositPending,
      pendingDuesGroups,
      underNoticeTenants,
      activeTenants,
    ] = await Promise.all([
      this.prisma.tenancy.count({
        where: {
          propertyId,
          deletedAt: null,
          tenancyStatus: {
            notIn: [
              TenancyStatus.EXITED,
              TenancyStatus.EVICTED,
              TenancyStatus.PENDING,
            ],
          },
          createdAt: {
            gte: todayStart,
            lt: tomorrowStart,
          },
          moveInTrackers: { none: {} },
          NOT: {
            tenancyStatus: TenancyStatus.ACTIVE,
            joinedAt: { gt: todayStart },
          },
        },
      }),

      this.prisma.tenancy.count({
        where: {
          propertyId,
          deletedAt: null,
          tenancyStatus: {
            notIn: [TenancyStatus.EXITED, TenancyStatus.EVICTED],
          },
          NOT: {
            moveInTrackers: { some: { status: MoveInstatus.MOVED_IN } },
          },
          OR: [
            { tenancyStatus: TenancyStatus.PENDING },
            {
              joinedAt: { gt: todayStart },
              tenancyStatus: TenancyStatus.ACTIVE,
            },
          ],
        },
      }),

      this.prisma.tenantDue.count({
        where: {
          propertyId,
          tenancy: { propertyId, deletedAt: null },
          dueType: 'SECURITY_DEPOSIT',
          status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
          balanceAmount: { gt: 0 },
        },
      }),

      this.prisma.tenantDue.groupBy({
        by: ['tenancyId'],
        where: {
          propertyId,
          tenancy: { propertyId, deletedAt: null },
          dueType: { not: 'SECURITY_DEPOSIT' },
          status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
          balanceAmount: { gt: 0 },
        },
      }),

      this.prisma.tenancy.count({
        where: {
          propertyId,
          deletedAt: null,
          tenancyStatus: TenancyStatus.NOTICE_PERIOD,
        },
      }),

      this.prisma.tenancy.count({
        where: {
          propertyId,
          deletedAt: null,
          tenancyStatus: TenancyStatus.ACTIVE,
          joinedAt: { lte: todayStart },
        },
      }),
    ]);

    const totalTenants = activeTenants + waitingToMoveIn + underNoticeTenants;

    return {
      totalTenants,
      activeTenants,
      underNoticeTenants,
      todayBookings,
      waitingToMoveIn,
      securityDepositPending,
      pendingDues: pendingDuesGroups.length,
    };
  }

  private normalizeTenentProfile(profile: any) {
    if (!profile) return null;
    return {
      gender: profile.geneder ?? null,
      profession: profile.profession ?? null,
      pinCode: profile.pinCode ?? null,
      state: profile.state ?? null,
      address: profile.Address ?? null,
      profileImage: profile.profileImage ?? null,
    };
  }

  async editProfileByTenant(
    tenantId: number,
    dto: UpdateTenantDto,
    profileImage?: Express.Multer.File,
  ) {
    const tenant = await this.prisma.user.findUnique({
      where: { id: tenantId, role: UserRole.TENANT },
      include: { tenentProfile: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    let newProfileImageUrl: string | undefined;
    if (profileImage) {
      newProfileImageUrl = await this.s3Serice.uploadFile(
        profileImage,
        `tenant-profile/${tenantId}`,
      );
      if (tenant.tenentProfile?.profileImage) {
        try {
          await this.s3Serice.deleteFile(tenant.tenentProfile.profileImage);
        } catch (error) {
          console.error('Could not delete previous tenant profile image', error);
        }
      }
    }

    const userUpdate: Record<string, string> = {};
    if (dto.fullName !== undefined) userUpdate.fullName = dto.fullName;
    if (dto.email !== undefined) userUpdate.email = dto.email;

    if (Object.keys(userUpdate).length > 0) {
      await this.prisma.user.update({
        where: { id: tenantId },
        data: userUpdate,
      });
    }

    const profileData: Record<string, any> = {};
    if (dto.gender !== undefined) profileData.geneder = dto.gender;
    if (dto.profession !== undefined) profileData.profession = dto.profession;
    if (dto.pinCode !== undefined) profileData.pinCode = dto.pinCode;
    if (dto.state !== undefined) profileData.state = dto.state;
    if (dto.address !== undefined) profileData.Address = dto.address;
    if (newProfileImageUrl) {
      profileData.profileImage = newProfileImageUrl;
    } else if (dto.profileImage !== undefined) {
      profileData.profileImage = dto.profileImage;
    }

    if (tenant.tenentProfile) {
      if (Object.keys(profileData).length > 0) {
        await this.prisma.tenentProfile.update({
          where: { userId: tenantId },
          data: profileData as any,
        });
      }
    } else if (Object.keys(profileData).length > 0 || dto.pinCode) {
      await this.prisma.tenentProfile.create({
        data: {
          userId: tenantId,
          pinCode: dto.pinCode || '000000',
          JoiningDate: toLocalDateOnly(new Date()),
          ...profileData,
        } as any,
      });
    }

    return this.fetchTenancyDetails(tenantId);
  }

  async updateTenant(
    tenantId: number,
    dto: UpdateTenantDto,
    profileImage?: Express.Multer.File,
  ) {
    const tenant = await this.prisma.user.findUnique({
      where: { id: tenantId },
      include: { tenentProfile: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    let newProfileImageUrl: string | undefined;
    if (profileImage) {
      newProfileImageUrl = await this.s3Serice.uploadFile(
        profileImage,
        `tenant-profile/${tenantId}`,
      );
      if (tenant.tenentProfile?.profileImage) {
        try {
          await this.s3Serice.deleteFile(tenant.tenentProfile.profileImage);
        } catch (error) {
          console.error('Could not delete previous tenant profile image', error);
        }
      }
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
      if (newProfileImageUrl) {
        profileUpdateData.profileImage = newProfileImageUrl;
      } else if (dto.profileImage !== undefined) {
        profileUpdateData.profileImage = dto.profileImage;
      }

      if (Object.keys(profileUpdateData).length > 0) {
        await this.prisma.tenentProfile.update({
          where: { userId: tenantId },
          data: profileUpdateData as any,
        });
      }
    }

    return this.getTenantById(tenantId);
  }

  async deleteTenant(tenantId: number, propertyId: number, ownerUserId: number) {
    const tenant = await this.prisma.user.findFirst({
      where: { id: tenantId, role: UserRole.TENANT },
      select: {
        id: true,
        fullName: true,
        tenancy: {
          where: {
            propertyId,
            tenancyStatus: { in: ['ACTIVE', 'NOTICE_PERIOD', 'PENDING'] },
            deletedAt: null,
          },
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

    const tenancy = tenant.tenancy[0];
    if (!tenancy) {
      throw new NotFoundException(
        'No tenancy found for this tenant in the given property',
      );
    }

    if (tenancy.property.ownerId !== ownerUserId) {
      throw new ForbiddenException("You do not own this tenant's property");
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

    const now = nowIST();
    await this.prisma.$transaction(async (tx) => {
      await tx.tenancy.update({
        where: { id: tenancy.id },
        data: { tenancyStatus: 'EXITED', deletedAt: now, leftAt: now },
      });

      await tx.room.update({
        where: { id: tenancy.roomId },
        data: { occupiedBeds: { decrement: 1 } },
      });

      const curMonth = now.getUTCMonth() + 1;
      const curYear = now.getUTCFullYear();
      await tx.propertyMetrics.updateMany({
        where: { propertyId: tenancy.propertyId, month: curMonth, year: curYear },
        data: { activeTenants: { decrement: 1 }, occupiedBeds: { decrement: 1 } },
      });
    });

    const tenantDeletedEventPayload: TenantDeletedEvent = {
      propertyId: tenancy.propertyId,
      tenantId: tenantId,
      deletedAt: nowIST(),
    };
    this.serviceEventPublisher.publishTenantDeletedEvent(tenantDeletedEventPayload);

    return {
      message: `Tenant ${tenant.fullName} exited successfully`,
      tenantId,
      tenancyId: tenancy.id,
      propertyName: tenancy.property.name,
    };
  }

  async revokeTenancyExit(tenancyId: number, ownerUserId: number) {
    const tenancy = await this.prisma.tenancy.findFirst({
      where: {
        id: tenancyId,
        tenancyStatus: TenancyStatus.EXITED,
        property: { ownerId: ownerUserId },
      },
      select: {
        id: true,
        roomId: true,
        propertyId: true,
        tenentId: true,
        room: { select: { roomNumber: true } },
        property: { select: { name: true } },
      },
    });

    if (!tenancy) throw new NotFoundException('Exited tenancy not found or access denied');

    const now = nowIST();
    await this.prisma.$transaction(async (tx) => {
      await tx.tenancy.update({
        where: { id: tenancyId },
        data: { tenancyStatus: TenancyStatus.ACTIVE, deletedAt: null, leftAt: null },
      });

      await tx.room.update({
        where: { id: tenancy.roomId },
        data: { occupiedBeds: { increment: 1 } },
      });

      await tx.user.update({
        where: { id: tenancy.tenentId },
        data: { isActive: true, deletedAt: null },
      });

      const curMonth = now.getUTCMonth() + 1;
      const curYear = now.getUTCFullYear();
      await tx.propertyMetrics.updateMany({
        where: { propertyId: tenancy.propertyId, month: curMonth, year: curYear },
        data: { activeTenants: { increment: 1 }, occupiedBeds: { increment: 1 } },
      });
    });

    return {
      message: 'Tenancy revoked — tenant is active again',
      tenancyId,
      propertyName: tenancy.property.name,
      roomNumber: tenancy.room.roomNumber,
    };
  }

  async requestMoveOut(tenantUserId: number, dto: RequestMoveOutDto) {
    const tenancy = await this.prisma.tenancy.findFirst({
      where: {
        tenentId: tenantUserId,
        propertyId: dto.propertyId,
        tenancyStatus: { in: [TenancyStatus.ACTIVE, TenancyStatus.NOTICE_PERIOD] },
        deletedAt: null,
      },
      select: { id: true, propertyId: true },
    });

    if (!tenancy) throw new NotFoundException('No active tenancy found for this property');

    const existing = await this.prisma.moveOutRequest.findFirst({
      where: { tenancyId: tenancy.id, status: 'PENDING' },
    });
    if (existing) throw new ConflictException('A pending move-out request already exists for this tenancy');

    const request = await this.prisma.moveOutRequest.create({
      data: {
        tenantId: tenantUserId,
        tenancyId: tenancy.id,
        propertyId: dto.propertyId,
        requestedMoveOutDate: new Date(dto.requestedMoveOutDate),
        status: 'PENDING',
      },
    });

    return { message: 'Move-out request submitted successfully', requestId: request.id };
  }

  async getMyMoveOutRequest(tenantUserId: number) {
    const request = await this.prisma.moveOutRequest.findFirst({
      where: { tenantId: tenantUserId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        requestedMoveOutDate: true,
        rejectionReason: true,
        createdAt: true,
        property: { select: { id: true, name: true } },
        tenancy: {
          select: {
            room: { select: { roomNumber: true, floorNumber: true } },
          },
        },
      },
    });

    if (!request) throw new NotFoundException('No move-out request found');
    return request;
  }

  async requestRoomShift(tenantUserId: number, dto: RequestRoomShiftDto) {
    const tenancy = await this.prisma.tenancy.findFirst({
      where: {
        tenentId: tenantUserId,
        propertyId: dto.propertyId,
        tenancyStatus: { in: [TenancyStatus.ACTIVE, TenancyStatus.NOTICE_PERIOD] },
        deletedAt: null,
      },
      select: { id: true, propertyId: true, roomId: true },
    });

    if (!tenancy) {
      throw new NotFoundException('No active tenancy found for this property');
    }

    const destinationPropertyId = dto.requestedPropertyId ?? tenancy.propertyId;

    if (dto.requestedRoomId === tenancy.roomId && destinationPropertyId === tenancy.propertyId) {
      throw new BadRequestException('Requested room is the same as your current room');
    }

    const currentProperty = await this.prisma.property.findUnique({
      where: { id: tenancy.propertyId },
      select: { ownerId: true },
    });
    if (!currentProperty) {
      throw new NotFoundException('Current property not found');
    }

    const destRoom = await this.prisma.room.findFirst({
      where: {
        id: dto.requestedRoomId,
        propertyId: destinationPropertyId,
        property: { ownerId: currentProperty.ownerId },
      },
      select: {
        id: true,
        roomNumber: true,
        occupiedBeds: true,
        totalBeds: true,
      },
    });

    if (!destRoom) {
      throw new NotFoundException('Requested room not found or not accessible');
    }

    if (destRoom.occupiedBeds >= destRoom.totalBeds) {
      throw new ConflictException(
        `Room ${destRoom.roomNumber} is full — choose another room`,
      );
    }

    const existing = await this.prisma.roomShiftRequest.findFirst({
      where: { tenancyId: tenancy.id, status: 'PENDING' },
    });
    if (existing) {
      throw new ConflictException(
        'A pending room shift request already exists for this tenancy',
      );
    }

    const request = await this.prisma.roomShiftRequest.create({
      data: {
        tenantId: tenantUserId,
        tenancyId: tenancy.id,
        propertyId: dto.propertyId,
        requestedRoomId: dto.requestedRoomId,
        requestedPropertyId:
          destinationPropertyId !== tenancy.propertyId
            ? destinationPropertyId
            : null,
        reason: dto.reason?.trim() || null,
        status: 'PENDING',
      },
    });

    return {
      message: 'Room shift request submitted successfully',
      requestId: request.id,
    };
  }

  async getMyRoomShiftRequest(tenantUserId: number) {
    const request = await this.prisma.roomShiftRequest.findFirst({
      where: { tenantId: tenantUserId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        reason: true,
        rejectionReason: true,
        createdAt: true,
        property: { select: { id: true, name: true } },
        requestedProperty: { select: { id: true, name: true } },
        tenancy: {
          select: {
            room: { select: { roomNumber: true, floorNumber: true } },
          },
        },
        requestedRoom: {
          select: { roomNumber: true, floorNumber: true },
        },
      },
    });

    if (!request) throw new NotFoundException('No room shift request found');
    return request;
  }

  async getAvailableRoomsForShift(tenantUserId: number, propertyId: number) {
    const tenancy = await this.prisma.tenancy.findFirst({
      where: {
        tenentId: tenantUserId,
        propertyId,
        tenancyStatus: { in: [TenancyStatus.ACTIVE, TenancyStatus.NOTICE_PERIOD] },
        deletedAt: null,
      },
      select: {
        id: true,
        roomId: true,
        property: { select: { ownerId: true } },
      },
    });

    if (!tenancy) {
      throw new NotFoundException('No active tenancy found for this property');
    }

    const ownerProperties = await this.prisma.property.findMany({
      where: { ownerId: tenancy.property.ownerId },
      select: { id: true, name: true },
    });
    const ownerPropertyIds = ownerProperties.map((p) => p.id);

    const rooms = await this.prisma.room.findMany({
      where: {
        propertyId: { in: ownerPropertyIds },
      },
      select: {
        id: true,
        roomNumber: true,
        floorNumber: true,
        totalBeds: true,
        occupiedBeds: true,
        sharingType: true,
        propertyId: true,
        property: { select: { id: true, name: true } },
      },
      orderBy: [{ propertyId: 'asc' }, { floorNumber: 'asc' }, { roomNumber: 'asc' }],
    });

    return rooms
      .filter((room) => room.occupiedBeds < room.totalBeds)
      .filter(
        (room) =>
          !(room.id === tenancy.roomId && room.propertyId === propertyId),
      )
      .map((room) => ({
        id: room.id,
        roomNumber: room.roomNumber,
        floorNumber: room.floorNumber,
        sharingType: room.sharingType,
        availableBeds: room.totalBeds - room.occupiedBeds,
        property: room.property,
        isCurrentRoom: room.id === tenancy.roomId,
      }));
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
        moveInTrackers: {
          select: { id: true, status: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return tenancies.map((tenancy) => this.mapTenancyToListItem(tenancy));
  }

  async fetchTenancyDetails(tenantId: number) {
    const tenant = await this.prisma.user.findUnique({
      where: { id: tenantId, role: UserRole.TENANT },
      include: {
        tenentProfile: true,
        tenancy: {
          where: {
            tenancyStatus: { in: ['ACTIVE', 'NOTICE_PERIOD'] },
            deletedAt: null,
          },
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

    const { tenentProfile, ...rest } = tenant;
    return {
      ...rest,
      tenentProfile: this.normalizeTenentProfile(tenentProfile),
    };
  }

  // async editProfile(tenantId:number,editProfileDto:UpdateProfileDto,image?:Express.Multer.File[]){
  //    const user = await this.prisma.user.findUnique({where:{id:tenantId},include:{tenentProfile:true}})
  //    if(!user) throw new NotFoundException('user not found');
  //    if(!user.tenentProfile || user.role !== UserRole.TENANT) throw new ForbiddenException();
  //    let updatedData = {};
  //    if(image)
  // }
}
