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
    const userExists = await this.prisma.user.findFirst({
      where: { phoneNumber: dto.phoneNumber },
    });

    if (userExists)
      throw new ConflictException('user exists with this phone number');
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: dto.fullName,
          phoneNumber: dto.phoneNumber,
          role: UserRole.MAINTENANCE_STAFF,
        },
      });
      const staffProfile = await tx.maintenanceStaffProfile.create({
        data: {
          userId: user.id,
          phoneNumber: dto.phoneNumber,
          whatsAppNumber: dto.whatsappNumber,
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


  async getStaffDetailsById(profileId:number){
    const record = await this.prisma.maintenanceStaffProfile.findUnique({
      where:{
        id:profileId
      },
       select:{
        id:true,
        phoneNumber:true,
        whatsAppNumber:true,
        staffType:true,
        jobPosition:true,
        monthlySalary:true,
        user:{
          select:{
            fullName:true,
          }
        },
        maintenanceStaffPropertyAccesses:{
          select:{
            property:{
              select:{
                name:true,
                id:true
              }
            }
          }
        }
       }
    })
    if(!record) throw new NotFoundException()
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
      if (dto.phoneNumber) staffUpdateData.phoneNumber = dto.phoneNumber;
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
      },
      select: {
        employeeProfile: {
          select: {
            id:true,
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
                fullName: true,
              },
            },
          },
        },
      },
    });
    return records.map(StaffMapper.toResponse);
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
