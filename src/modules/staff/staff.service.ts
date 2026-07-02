import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { CreateStaffDto } from './dto/create.staff.dto';
import {
  MaintenanceJobPosition,
  MaintenanceStaffType,
  PropertyAccessScope,  
  UserRole,
} from '@prisma/client';
import { StaffMapper } from './mappers/staff.mappers';
import { EditStaffAccessDto } from './dto/edit-Staff_Access.dto';
import { EditEmployeeProfileDto } from './dto/edit.staff.profile.dto';
import { UpdateStaffAppPermissionsDto } from './dto/update-app-permissions.dto';
import {
  normalizePhoneNumber,
  phoneSearchVariants,
} from 'src/utils/phone.utils';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async createMaintenanceStaff(ownerId: number, dto: CreateStaffDto) {
    if (
      dto.propertyScope === PropertyAccessScope.SELECTIVE &&
      dto.allowedProperties.length === 0
    ) {
      throw new BadRequestException(
        'Property list cannot be empty for selective access scope',
      );
    }
    if (dto.allowedProperties?.length) {
      const count = await this.prisma.property.count({
        where: { id: { in: dto.allowedProperties }, ownerId: ownerId },
      });
      if (count !== dto.allowedProperties.length) {
        throw new BadRequestException(
          'One or more properties are invalid for the owner',
        );
      }
    }

    // ** fetch all propertyId
    const propertyIds = await this.prisma.property.findMany({
      where: { ownerId: ownerId },
      select: {
        id: true,
      },
    });

    const ownerPropertyIds = propertyIds?.map((p) => p.id);
    const propertyIdSet = new Set(ownerPropertyIds);
    const incomingPropertyIds = [...dto.allowedProperties];

    for (const id of incomingPropertyIds) {
      if (!propertyIdSet.has(id)) {
        throw new BadRequestException('something went wrong');
      }
    }

    // ** check if the user already exists with the phone Number
    const phoneNumber = normalizePhoneNumber(dto.phoneNumber);
    const whatsappNumber = normalizePhoneNumber(dto.whatsappNumber);
    const userExists = await this.prisma.user.findFirst({
      where: { phoneNumber: { in: phoneSearchVariants(phoneNumber) } },
    });

    if (userExists)
      throw new ConflictException('user exists with this phone number');
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: dto.fullName,
          phoneNumber,
          role: UserRole.MAINTENANCE_STAFF,
        },
      });
      const staffProfile = await tx.maintenanceStaffProfile.create({
        data: {
          userId: user.id,
          phoneNumber,
          whatsAppNumber: whatsappNumber,
          monthlySalary: dto.monthlySalary,
          staffType: dto.staffType as MaintenanceStaffType,
          jobPosition: dto.jobPosition as MaintenanceJobPosition,
          propertyScope: dto.propertyScope as PropertyAccessScope,
        },
      });

      // selective property mapping
      await tx.maintenanceStaffPropertyAccess.createMany({
        data: dto.allowedProperties.map((propertyId) => ({
          staffProfileId: staffProfile.id,
          propertyId: propertyId,
        })),
      });

      //   ** update employee book
      await tx.employeeBook.create({
        data: {
          employeeProfileId: staffProfile.id,
          ownerId: ownerId,
        },
      });
      return {
        id: user.id,
        profileId: staffProfile.id,
        name: user.fullName,
        staffType: staffProfile.staffType,
        jobPosition: staffProfile.jobPosition,
        propertyScope: staffProfile.propertyScope,
      };
    });
    return {
      message: 'staff added successfully',
      result,
    };
  }

  async getStaffDetailsById(profileId: number) {
    const record = await this.prisma.maintenanceStaffProfile.findUnique({
      where: {
        id: profileId,
      },
      select: {
        id: true,
        phoneNumber: true,
        whatsAppNumber: true,
        staffType: true,
        jobPosition: true,
        monthlySalary: true,
        propertyScope: true,
        isActive: true,
        canAccessRooms: true,
        canAccessTenants: true,
        canAccessFinance: true,
        canAccessComplaints: true,
        canManageStaff: true,
        granularPermissions: true,
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
        maintenanceStaffPropertyAccesses: {
          select: {
            property: {
              select: {
                name: true,
                id: true,
              },
            },
          },
        },
      },
    });
    if (!record) throw new NotFoundException();
    return record;
  }

  async editMaintenanceStaffProfile(
    dto: EditEmployeeProfileDto,
    ownerId: number,
    staffProfileId: number,
  ) {
    const emp = await this.prisma.maintenanceStaffProfile.findUnique({
      where: { id: staffProfileId },
    });
    if (!emp) throw new NotFoundException('Employee not found');
    const employee_validate_record = await this.validateOwnertoEmployeeMapping(
      ownerId,
      staffProfileId,
    );
    if (!employee_validate_record) throw new ForbiddenException();

    const result = await this.prisma.$transaction(async (tx) => {
      if (dto.name) {
        await tx.user.update({
          where: { id: emp.userId },
          data: { fullName: dto.name },
        });
      }

      const staffUpdateData: any = {};
      if (dto.staffType) staffUpdateData.staffType = dto.staffType;
      if (dto.phoneNumber)
        staffUpdateData.phoneNumber = normalizePhoneNumber(dto.phoneNumber);
      if (dto.salary) staffUpdateData.monthlySalary = dto.salary;
      if (dto.jobPosition) staffUpdateData.jobPosition = dto.jobPosition;

      if (Object.keys(staffUpdateData).length > 0) {
        await tx.maintenanceStaffProfile.update({
          where: { id: staffProfileId },
          data: staffUpdateData,
        });
      }

      return {
        message: 'Staff profile update done sucessfully',
      };
    });

    return result;
  }

  async getMaintenanceStaffsByOwner(ownerId: number) {
    const records = await this.prisma.employeeBook.findMany({
      where: {
        ownerId: ownerId,
        employeeProfile: { isActive: true },
      },
      select: {
        employeeProfile: {
          select: {
            id: true,
            staffType: true,
            jobPosition: true,
            monthlySalary: true,
            propertyScope: true,
            phoneNumber: true,
            whatsAppNumber: true,
            maintenanceStaffPropertyAccesses: {
              select: {
                property: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            user: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
      },
    });
    const formattedResponse = records.map((ep) => ({
      userInformation: {
        userId: ep.employeeProfile.user.id,
        fullName: ep.employeeProfile.user.fullName,
        phoneNumber:ep.employeeProfile.phoneNumber,
        whatsappNumber:ep.employeeProfile.whatsAppNumber
      },
      profileDetails:{
        profileId:ep.employeeProfile.id,
        staffType:ep.employeeProfile.staffType,
        jobPosition:ep.employeeProfile.jobPosition,
        salaryPerMonth:ep.employeeProfile.monthlySalary,
        propertyScope:ep.employeeProfile.propertyScope,
      },
      maintenanceStaffPropertyAccesses:ep.employeeProfile.maintenanceStaffPropertyAccesses
    }));
    return formattedResponse
  }

  async fetchAllocatedStaffByPropertyId(propertyId: number, ownerId: number) {
    await this.validateOwnerToPropertyMapping(propertyId, ownerId);
    const record = await this.prisma.maintenanceStaffPropertyAccess.findMany({
      where: {
        propertyId: propertyId,
      },
      select: {
        staffProfile: {
          select: {
            id: true,
            whatsAppNumber: true,
            phoneNumber: true,
            jobPosition: true,
            staffType: true,
            user: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
    });
    return record;
  }

  async getStaffCollectionSummaryByProperty(propertyId: number, ownerId: number) {
    await this.validateOwnerToPropertyMapping(propertyId, ownerId);

    const staffAccesses = await this.prisma.maintenanceStaffPropertyAccess.findMany({
      where: { propertyId },
      select: {
        staffProfile: {
          select: {
            id: true,
            staffType: true,
            jobPosition: true,
            monthlySalary: true,
            phoneNumber: true,
            whatsAppNumber: true,
            user: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                email: true,
              },
            },
          },
        },
      },
    });

    const userIds = staffAccesses.map((a) => a.staffProfile.user.id);

    // fetch all payments collected by these staff for this property in one query
    const allPayments = await this.prisma.duePayment.findMany({
      where: {
        propertyId,
        recordedById: { in: userIds },
      },
      select: {
        recordedById: true,
        amount: true,
        paymentMode: true,
        paidAt: true,
      },
    });

    // group by recordedById
    const paymentsByStaff = new Map<number, { total: number; count: number; byMode: Record<string, number> }>();
    for (const p of allPayments) {
      const entry = paymentsByStaff.get(p.recordedById) ?? { total: 0, count: 0, byMode: {} };
      entry.total += Number(p.amount);
      entry.count += 1;
      entry.byMode[p.paymentMode] = (entry.byMode[p.paymentMode] ?? 0) + Number(p.amount);
      paymentsByStaff.set(p.recordedById, entry);
    }

    const result = staffAccesses.map((a) => {
      const { user, ...profile } = a.staffProfile;
      const stats = paymentsByStaff.get(user.id) ?? { total: 0, count: 0, byMode: {} };
      return {
        userId: user.id,
        name: user.fullName,
        phone: user.phoneNumber,
        email: user.email,
        profile: {
          profileId: profile.id,
          staffType: profile.staffType,
          jobPosition: profile.jobPosition,
          monthlySalary: profile.monthlySalary,
          phone: profile.phoneNumber,
          whatsApp: profile.whatsAppNumber,
        },
        collections: {
          totalCollected: stats.total,
          totalTransactions: stats.count,
          byPaymentMode: Object.entries(stats.byMode).map(([mode, amount]) => ({ mode, amount })),
        },
      };
    });

    const grandTotal = result.reduce((sum, s) => sum + s.collections.totalCollected, 0);

    return {
      propertyId,
      grandTotalCollected: grandTotal,
      staff: result,
    };
  }

  async editStaffAccess(ownerId: number, dto: EditStaffAccessDto) {
    const staff_profile_record = await this.findStaff(dto.staffProfileId);
    if (!staff_profile_record) throw new NotFoundException('staff not found');
    const valid_owner_staff_mapping_record =
      await this.prisma.employeeBook.findFirst({
        where: { ownerId: ownerId, employeeProfileId: dto.staffProfileId },
      });
    if (!valid_owner_staff_mapping_record) throw new ForbiddenException();

    const allProperties = await this.prisma.property.findMany({
      where: { ownerId: ownerId },
      select: { id: true },
    });

    const ownerPropertyIds = allProperties?.map((p) => p.id);
    const ownerPropertyIdSet = new Set(ownerPropertyIds);

    // validate incoming dtos
    const allIncomingIds = [
      ...dto.newAccessPropertyIds,
      ...dto.removedAccessPropetyIds,
    ];

    for (const id of allIncomingIds) {
      if (!ownerPropertyIdSet.has(id)) {
        throw new BadRequestException('something went wrong');
      }
    }

    const hasAdds = dto.newAccessPropertyIds.length > 0;
    const hasRemovals = dto.removedAccessPropetyIds.length > 0;

    // ** prisma transaction starts here
    const result = await this.prisma.$transaction(async (tx) => {
      if (
        staff_profile_record.propertyScope ===
          PropertyAccessScope.ALL_PROPERTIES &&
        hasRemovals
      ) {
        //  ** chnage the scope to ALL_PROPERTIES -> SELECTIVE
        await tx.maintenanceStaffProfile.update({
          where: { id: staff_profile_record.id },
          data: { propertyScope: PropertyAccessScope.SELECTIVE },
        });

        //  ** delete the permissions
        await tx.maintenanceStaffPropertyAccess.deleteMany({
          where: {
            staffProfileId: staff_profile_record.id,
            propertyId: { in: dto.removedAccessPropetyIds },
          },
        });
      } else {
        // ** this scope defies the staff has Selective scope
        if (hasRemovals) {
          await tx.maintenanceStaffPropertyAccess.deleteMany({
            where: {
              staffProfileId: staff_profile_record.id,
              propertyId: { in: dto.removedAccessPropetyIds },
            },
          });
        }
        if (hasAdds) {
          await tx.maintenanceStaffPropertyAccess.createMany({
            data: dto.newAccessPropertyIds.map((propertyId) => ({
              staffProfileId: staff_profile_record.id,
              propertyId: propertyId,
            })),
          });
        }
      }
      return true;
    });

    return {
      message: 'staff access updates sucessfully',
    };
  }

  async getExpensesByStaffUserId(userId: number) {
    const staff = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!staff) throw new NotFoundException('Staff user not found');

    const expenses = await this.prisma.expenses.findMany({
      where: { payerUserId: userId },
      select: {
        id: true,
        month: true,
        year: true,
        amount: true,
        description: true,
        expenseCategory: true,
        modeOfPayment: true,
        RecipientName: true,
        transactionId: true,
        paymentDate: true,
        image: true,
        property: { select: { id: true, name: true } },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    return expenses;
  }

  async getPaymentsCollectedByStaff(userId: number) {
    const staff = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        email: true,
        role: true,
        maintenanceStaffProfile: {
          select: {
            id: true,
            staffType: true,
            jobPosition: true,
            monthlySalary: true,
            phoneNumber: true,
            whatsAppNumber: true,
            maintenanceStaffPropertyAccesses: {
              select: {
                property: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
    if (!staff) throw new NotFoundException('Staff user not found');

    const payments = await this.prisma.duePayment.findMany({
      where: { recordedById: userId },
      select: {
        id: true,
        amount: true,
        paymentMode: true,
        upiApp: true,
        transactionId: true,
        notes: true,
        proofImageUrl: true,
        paidAt: true,
        month: true,
        year: true,
        due: {
          select: {
            dueType: true,
            title: true,
            totalAmount: true,
            balanceAmount: true,
            status: true,
            property: { select: { id: true, name: true } },
            tenancy: {
              select: {
                room: { select: { roomNumber: true } },
                tenent: { select: { id: true, fullName: true, phoneNumber: true } },
              },
            },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    // summary stats
    const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    const byPropertyMap = new Map<number, { propertyId: number; propertyName: string; amount: number; count: number }>();
    const byModeMap = new Map<string, { mode: string; amount: number; count: number }>();

    for (const p of payments) {
      const prop = p.due.property;
      if (prop) {
        const existing = byPropertyMap.get(prop.id) ?? { propertyId: prop.id, propertyName: prop.name, amount: 0, count: 0 };
        existing.amount += Number(p.amount);
        existing.count += 1;
        byPropertyMap.set(prop.id, existing);
      }

      const mode = p.paymentMode as string;
      const existingMode = byModeMap.get(mode) ?? { mode, amount: 0, count: 0 };
      existingMode.amount += Number(p.amount);
      existingMode.count += 1;
      byModeMap.set(mode, existingMode);
    }

    return {
      staff: {
        userId: staff.id,
        name: staff.fullName,
        phone: staff.phoneNumber,
        email: staff.email,
        role: staff.role,
        profile: staff.maintenanceStaffProfile
          ? {
              profileId: staff.maintenanceStaffProfile.id,
              staffType: staff.maintenanceStaffProfile.staffType,
              jobPosition: staff.maintenanceStaffProfile.jobPosition,
              monthlySalary: staff.maintenanceStaffProfile.monthlySalary,
              phone: staff.maintenanceStaffProfile.phoneNumber,
              whatsApp: staff.maintenanceStaffProfile.whatsAppNumber,
              assignedProperties: staff.maintenanceStaffProfile.maintenanceStaffPropertyAccesses.map(
                (a) => ({ id: a.property.id, name: a.property.name }),
              ),
            }
          : null,
      },
      summary: {
        totalCollected,
        totalTransactions: payments.length,
        byProperty: Array.from(byPropertyMap.values()),
        byPaymentMode: Array.from(byModeMap.values()),
      },
      payments,
    };
  }

  async deleteStaff(ownerId: number, staffProfileId: number) {
    const staffProfile = await this.prisma.maintenanceStaffProfile.findUnique({
      where: { id: staffProfileId },
      select: { id: true, userId: true, isActive: true },
    });
    if (!staffProfile) throw new NotFoundException('Staff member not found');

    const employeeBook = await this.validateOwnertoEmployeeMapping(ownerId, staffProfileId);
    if (!employeeBook) throw new ForbiddenException('You do not have access to delete this staff member');

    await this.prisma.$transaction(async (tx) => {
      await tx.maintenanceStaffPropertyAccess.deleteMany({
        where: { staffProfileId },
      });

      await tx.employeeBook.deleteMany({
        where: { employeeProfileId: staffProfileId },
      });

      // Unassign from complaints instead of hard-deleting
      await tx.complaint.updateMany({
        where: { assignedMaintenanceStaffProfileId: staffProfileId },
        data: { assignedMaintenanceStaffProfileId: null },
      });

      await tx.maintenanceStaffProfile.update({
        where: { id: staffProfileId },
        data: { isActive: false },
      });

      await tx.user.update({
        where: { id: staffProfile.userId },
        data: { isActive: false },
      });
    });

    return { message: 'Staff member removed successfully' };
  }

  async updateStaffAppPermissions(ownerId: number, dto: UpdateStaffAppPermissionsDto) {
    const staffProfile = await this.prisma.maintenanceStaffProfile.findUnique({
      where: { id: dto.staffProfileId },
      select: { id: true, isActive: true },
    });
    if (!staffProfile) throw new NotFoundException('Staff member not found');
    if (!staffProfile.isActive) throw new BadRequestException('Cannot update permissions for an inactive staff member');

    const employeeBook = await this.validateOwnertoEmployeeMapping(ownerId, dto.staffProfileId);
    if (!employeeBook) throw new ForbiddenException('You do not have access to manage this staff member');

    await this.prisma.maintenanceStaffProfile.update({
      where: { id: dto.staffProfileId },
      data: {
        canAccessRooms: dto.canAccessRooms,
        canAccessTenants: dto.canAccessTenants,
        canAccessFinance: dto.canAccessFinance,
        canAccessComplaints: dto.canAccessComplaints,
        canManageStaff: dto.canManageStaff,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(dto.granularPermissions !== undefined
          ? { granularPermissions: dto.granularPermissions as any }
          : {}),
      },
    });

    return { message: 'App permissions updated successfully' };
  }

  async getStaffSelfProfile(userId: number) {
    const staffProfile = await this.prisma.maintenanceStaffProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        staffType: true,
        jobPosition: true,
        monthlySalary: true,
        propertyScope: true,
        phoneNumber: true,
        whatsAppNumber: true,
        isActive: true,
        canAccessRooms: true,
        canAccessTenants: true,
        canAccessFinance: true,
        canAccessComplaints: true,
        canManageStaff: true,
        granularPermissions: true,
        user: {
          select: { id: true, fullName: true, phoneNumber: true, email: true },
        },
        maintenanceStaffPropertyAccesses: {
          select: {
            property: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!staffProfile) throw new NotFoundException('Staff profile not found');
    if (!staffProfile.isActive) throw new ForbiddenException('Your account has been deactivated');

    return {
      userId: staffProfile.user.id,
      profileId: staffProfile.id,
      fullName: staffProfile.user.fullName,
      phoneNumber: staffProfile.phoneNumber,
      staffType: staffProfile.staffType,
      jobPosition: staffProfile.jobPosition,
      propertyScope: staffProfile.propertyScope,
      permissions: {
        canAccessRooms: staffProfile.canAccessRooms,
        canAccessTenants: staffProfile.canAccessTenants,
        canAccessFinance: staffProfile.canAccessFinance,
        canAccessComplaints: staffProfile.canAccessComplaints,
        canManageStaff: staffProfile.canManageStaff,
      },
      granularPermissions: staffProfile.granularPermissions ?? {},
      allowedPropertyIds: staffProfile.maintenanceStaffPropertyAccesses.map((a) => a.property.id),
      allowedProperties: staffProfile.maintenanceStaffPropertyAccesses.map((a) => a.property),
    };
  }

  //   private functions to handle things
  private async validateOwnerToPropertyMapping(
    propertyId: number,
    ownerId: number,
  ) {
    const property_record = await this.prisma.property.findFirst({
      where: {
        id: propertyId,
        ownerId: ownerId,
      },
    });
    if (!property_record) {
      throw new BadRequestException('access denied');
    }
    return true;
  }

  private async validateOwnertoEmployeeMapping(
    ownerId: number,
    empProfileId: number,
  ) {
    const record = await this.prisma.employeeBook.findFirst({
      where: {
        ownerId: ownerId,
        employeeProfileId: empProfileId,
      },
    });
    return record;
  }

  private async findStaff(staffProfileId: number) {
    const staff_profile_record =
      await this.prisma.maintenanceStaffProfile.findUnique({
        where: { id: staffProfileId },
      });
    return staff_profile_record;
  }
}
