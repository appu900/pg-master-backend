import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { CreateStaffDto } from './dto/create.staff.dto';
import {
  MaintenanceJobPosition,
  MaintenanceStaffType,
  PropertyAccessScope,
  UserRole,
} from '@prisma/client';
import { StaffMapper } from './dto/mappers/staff.mappers';

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
      if (dto.propertyScope === PropertyAccessScope.SELECTIVE) {
        await tx.maintenanceStaffPropertyAccess.createMany({
          data: dto.allowedProperties.map((propertyId) => ({
            staffProfileId: staffProfile.id,
            propertyId: propertyId,
          })),
        });
      }

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

  async getMaintenanceStaffsByOwner(ownerId: number) {
    const records = await this.prisma.employeeBook.findMany({
      where: {
        ownerId: ownerId,
      },
      select: {
        employeeProfile: {
          select: {
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
}
