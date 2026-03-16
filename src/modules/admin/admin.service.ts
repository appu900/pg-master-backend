import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BusinessApprovalStatus,
  TenancyStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async fetchAllPendingBusinessProfile(adminId: number) {
    const adminExists = await this.prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!adminExists) throw new ForbiddenException();

    return this.prisma.businessDetails.findMany({
      where: { status: BusinessApprovalStatus.PENDING },
      select: {
        id: true,
        businessName: true,
        businessType: true,
        aadhaarCard: true,
        panCard: true,
        companyDocument: true,
        propertyOwnerProfile: {
          select: {
            Profession: true,
            pinCode: true,
            State: true,
            profileImage: true,
            user: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
    });
  }

  async approveBusiness(businessId: number) {
    const result = await this.prisma.businessDetails.updateMany({
      where: {
        id: businessId,
        status: BusinessApprovalStatus.PENDING,
      },
      data: {
        status: BusinessApprovalStatus.APPROVED,
      },
    });

    if (result.count === 0)
      throw new BadRequestException(
        'Cannot perform this operation. Either record not found or not pending.',
      );

    return { message: 'Business approved successfully' };
  }

  async rejectBusiness(businessId: number, description?: string) {
    const result = await this.prisma.businessDetails.updateMany({
      where: {
        id: businessId,
        status: BusinessApprovalStatus.PENDING,
      },
      data: {
        status: BusinessApprovalStatus.REJECTED,
        rejectionReason: description ?? '',
      },
    });

    if (result.count === 0)
      throw new BadRequestException(
        'Cannot perform this operation. Either record not found or not pending.',
      );

    return { message: 'Business rejected successfully' };
  }

  async getAllPropertiesForAdmin() {
    const properties = await this.prisma.property.findMany({
      select: {
        id: true,
        name: true,
        pinCode: true,
        owner: { select: { fullName: true } },
        rooms: { select: { id: true, totalBeds: true, occupiedBeds: true } },
        tenents: {
          where: { tenancyStatus: TenancyStatus.ACTIVE },
          select: { id: true },
        },
      },
    });

    return properties.map((p) => {
      const totalBeds = p.rooms.reduce((s, r) => s + r.totalBeds, 0);
      const occupiedBeds = p.rooms.reduce((s, r) => s + r.occupiedBeds, 0);
      const tenantCount = p.tenents.length;

      const occupancyPct =
        totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

      return {
        id: p.id,
        name: p.name,
        pinCode: p.pinCode,
        ownerName: p.owner.fullName,
        totalRooms: p.rooms.length,
        totalBeds,
        occupiedBeds,
        tenantCount,
        occupancyPct,
      };
    });
  }

  async getPropertyDetailsForAdmin(propertyId: number) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        owner: {
          select: { fullName: true, email: true, phoneNumber: true },
        },
        rooms: {
          include: {
            images: { take: 1 },
            tenants: {
              where: { tenancyStatus: TenancyStatus.ACTIVE },
              include: {
                tenent: {
                  select: {
                    fullName: true,
                    email: true,
                    phoneNumber: true,
                    tenentProfile: {
                      select: {
                        profileImage: true,
                        JoiningDate: true,
                        moveOutDate: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!property) throw new NotFoundException('Property not found');

    return property;
  }

  async getPropertyFullStats(propertyId: number) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        owner: {
          select: { fullName: true, email: true, phoneNumber: true },
        },
        rooms: {
          orderBy: [{ floorNumber: 'asc' }, { roomNumber: 'asc' }],
          include: {
            images: { take: 1 },
            tenants: {
              where: { tenancyStatus: TenancyStatus.ACTIVE },
              include: {
                tenent: {
                  select: {
                    fullName: true,
                    email: true,
                    phoneNumber: true,
                    tenentProfile: {
                      select: {
                        profileImage: true,
                        JoiningDate: true,
                        moveOutDate: true,
                        profession: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        tenents: {
          where: { tenancyStatus: TenancyStatus.ACTIVE },
          orderBy: { joinedAt: 'desc' },
          include: {
            tenent: {
              select: {
                fullName: true,
                email: true,
                phoneNumber: true,
                tenentProfile: {
                  select: {
                    profileImage: true,
                    JoiningDate: true,
                    moveOutDate: true,
                    profession: true,
                    state: true,
                  },
                },
              },
            },
            room: {
              select: {
                roomNumber: true,
                floorNumber: true,
                sharingType: true,
                rentPerBed: true,
              },
            },
          },
        },
        complaints: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            createdAt: true,
            raisedBy: { select: { fullName: true } },
          },
        },
        maintenanceStaffPropertyAccess: {
          include: {
            staffProfile: {
              select: {
                jobPosition: true,
                staffType: true,
                isActive: true,
                monthlySalary: true,
                user: { select: { fullName: true, phoneNumber: true } },
              },
            },
          },
        },
      },
    });

    if (!property) throw new NotFoundException('Property not found');

    const totalBeds = property.rooms.reduce((s, r) => s + r.totalBeds, 0);
    const occupiedBeds = property.rooms.reduce((s, r) => s + r.occupiedBeds, 0);
    const vacantBeds = totalBeds - occupiedBeds;

    const activeTenants = property.tenents.length;

    const occupancyPct =
      totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    const monthlyRevenue = property.tenents.reduce(
      (s, t) => s + Number(t.rentAmount),
      0,
    );

    return {
      id: property.id,
      name: property.name,
      pinCode: property.pinCode,
      owner: property.owner,
      stats: {
        totalRooms: property.rooms.length,
        totalBeds,
        occupiedBeds,
        vacantBeds,
        occupancyPct,
        activeTenants,
        totalComplaints: property.complaints.length,
        staffCount: property.maintenanceStaffPropertyAccess.filter(
          (a) => a.staffProfile.isActive,
        ).length,
        monthlyRevenue,
        avgRentPerTenant:
          activeTenants > 0 ? Math.round(monthlyRevenue / activeTenants) : 0,
      },
      rooms: property.rooms,
      tenants: property.tenents,
      complaints: property.complaints,
      staff: property.maintenanceStaffPropertyAccess.map((a) => ({
        jobPosition: a.staffProfile.jobPosition,
        staffType: a.staffProfile.staffType,
        isActive: a.staffProfile.isActive,
        monthlySalary: a.staffProfile.monthlySalary,
        fullName: a.staffProfile.user.fullName,
        phoneNumber: a.staffProfile.user.phoneNumber,
      })),
    };
  }

  async getPlatformStats() {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const [
      totalOwners,
      totalTenants,
      totalProperties,
      totalComplaints,
      pendingBusinessCount,
      approvedBusinessCount,
      rejectedBusinessCount,
      newTenantsThisWeek,
    ] = await this.prisma.$transaction([
      this.prisma.user.count({
        where: { role: UserRole.PROPERTY_OWNER, isActive: true },
      }),
      this.prisma.user.count({
        where: { role: UserRole.TENANT, isActive: true },
      }),
      this.prisma.property.count(),
      this.prisma.complaint.count(),
      this.prisma.businessDetails.count({
        where: { status: BusinessApprovalStatus.PENDING },
      }),
      this.prisma.businessDetails.count({
        where: { status: BusinessApprovalStatus.APPROVED },
      }),
      this.prisma.businessDetails.count({
        where: { status: BusinessApprovalStatus.REJECTED },
      }),
      this.prisma.user.count({
        where: {
          role: UserRole.TENANT,
          isActive: true,
          createdAt: { gte: startOfWeek },
        },
      }),
    ]);

    return {
      totalOwners,
      totalTenants,
      totalProperties,
      totalComplaints,
      pendingBusinessCount,
      approvedBusinessCount,
      rejectedBusinessCount,
      newTenantsThisWeek,
    };
  }
}
