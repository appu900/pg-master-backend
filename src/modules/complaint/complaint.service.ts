import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { ComplaintCreateByOwnerDto } from './dto/create.complaint-by-owner.dto';
import {
  ComplaintStatus,
  MaintenanceJobPosition,
  MaintenancePriority,
  Prisma,
  TenancyStatus,
  UserRole,
} from '@prisma/client';
import { CreateComplaintDto } from './dto/create-.complaint-by-tenent.dto';
import { S3Service } from 'src/infra/s3/s3.service';
import { AddLogsDto } from './dto/addLogs.dto';
import { EditComplaintByTenantDto } from './dto/edit-complaint-by-tenant.dto';

type ComplaintAssignmentContext = {
  id: number;
  propertyId: number;
  assignedOwnerId: number | null;
  assignedMaintenanceStaffProfile: {
    user: { fullName: string };
    jobPosition: MaintenanceJobPosition;
  } | null;
};

@Injectable()
export class ComplaintService {
  private readonly COMPLAINT_S3_FOLDER_NAME = 'complaints';

  private readonly assigneeSelect = {
    assignedMaintenanceStaffProfile: {
      select: {
        id: true,
        user: { select: { fullName: true, phoneNumber: true } },
        whatsAppNumber: true,
        jobPosition: true,
      },
    },
    assignedOwner: {
      select: { id: true, fullName: true, phoneNumber: true },
    },
  } as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  private formatStaffAssigneeName(
    profile:
      | {
          user: { fullName: string };
          jobPosition?: MaintenanceJobPosition | null;
        }
      | null
      | undefined,
  ): string | null {
    if (!profile?.user?.fullName) return null;
    if (profile.jobPosition) {
      const role = String(profile.jobPosition).replace(/_/g, ' ').toLowerCase();
      return `${profile.user.fullName} (${role})`;
    }
    return profile.user.fullName;
  }

  private formatOwnerAssigneeName(
    owner: { fullName: string } | null | undefined,
  ): string | null {
    if (!owner?.fullName) return null;
    return `${owner.fullName} (Property Owner)`;
  }

  private buildAssignmentLogTitle(
    previousName: string | null,
    newName: string,
  ): string {
    if (previousName && previousName !== newName) {
      return `Reassigned from ${previousName} to ${newName}`;
    }
    return `Assigned to ${newName}`;
  }

  private async resolvePreviousAssigneeName(
    complaint: ComplaintAssignmentContext,
  ): Promise<string | null> {
    const staffName = this.formatStaffAssigneeName(
      complaint.assignedMaintenanceStaffProfile,
    );
    if (staffName) return staffName;

    if (!complaint.assignedOwnerId) return null;

    const owner = await this.prisma.user.findUnique({
      where: { id: complaint.assignedOwnerId },
      select: { fullName: true },
    });
    return this.formatOwnerAssigneeName(owner);
  }

  private buildAssignToOwnerUpdate(ownerUserId: number): Prisma.ComplaintUpdateInput {
    return {
      assignedOwnerId: ownerUserId,
      assignedMaintenanceStaffProfileId: null,
      status: ComplaintStatus.ASSIGNED,
    } as Prisma.ComplaintUpdateInput;
  }

  private buildAssignToStaffUpdate(
    staffProfileId: number,
  ): Prisma.ComplaintUpdateInput {
    return {
      assignedMaintenanceStaffProfileId: staffProfileId,
      assignedOwnerId: null,
      status: ComplaintStatus.ASSIGNED,
    } as Prisma.ComplaintUpdateInput;
  }

  // create complaint by owner
  async createComplaintByOwner(
    ownerId: number,
    dto: ComplaintCreateByOwnerDto,
    images?: Express.Multer.File[],
  ) {
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
    });
    if (!owner || owner.role != UserRole.PROPERTY_OWNER)
      throw new ForbiddenException();
    if (dto.tenantId) {
      const tenancy = await this.prisma.tenancy.findFirst({
        where: { tenentId: dto.tenantId, property: { ownerId: owner.id } },
      });
      if (!tenancy)
        throw new BadRequestException('Invalid tenant for this request owner');
    }

    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId, ownerId: owner.id },
      select: { id: true },
    });
    if (!property) {
      throw new ForbiddenException('Property not found or access denied');
    }

    if (dto.assignToSelf && dto.assignedMaintenanceStaffProfileId) {
      throw new BadRequestException(
        'Cannot assign both yourself and a staff member',
      );
    }

    if (dto.assignedMaintenanceStaffProfileId) {
      const staffBook = await this.prisma.employeeBook.findFirst({
        where: {
          ownerId: owner.id,
          employeeProfileId: dto.assignedMaintenanceStaffProfileId,
        },
      });
      if (!staffBook) {
        throw new ForbiddenException('Staff not found or access denied');
      }
    }

    // images upload endpoint
    let uploadImageUrls: string[] = [];
    if (images && images.length > 0) {
      for (const image of images) {
        const url = await this.s3Service.uploadFile(
          image,
          this.COMPLAINT_S3_FOLDER_NAME,
        );
        uploadImageUrls.push(url);
      }
    }

    let initialLogTitle = 'Complaint raised';
    if (dto.assignToSelf) {
      const ownerName = this.formatOwnerAssigneeName(owner);
      initialLogTitle = ownerName
        ? `Complaint raised · ${this.buildAssignmentLogTitle(null, ownerName)}`
        : 'Complaint raised and assigned to property owner';
    } else if (dto.assignedMaintenanceStaffProfileId) {
      const staff = await this.prisma.maintenanceStaffProfile.findUnique({
        where: { id: dto.assignedMaintenanceStaffProfileId },
        select: {
          user: { select: { fullName: true } },
          jobPosition: true,
        },
      });
      const staffName = this.formatStaffAssigneeName(staff);
      initialLogTitle = staffName
        ? `Complaint raised · ${this.buildAssignmentLogTitle(null, staffName)}`
        : 'Complaint raised and assigned to staff';
    }

    const complaint = await this.prisma.complaint.create({
      data: {
        title: dto.title,
        description: dto.description,
        raisedById: dto.tenantId ?? ownerId,
        propertyId: dto.propertyId,
        assignedMaintenanceStaffProfileId: dto.assignToSelf
          ? null
          : (dto.assignedMaintenanceStaffProfileId ?? null),
        assignedOwnerId: dto.assignToSelf ? ownerId : null,
        status: dto.status as ComplaintStatus,
        roomNumber: dto.roomNumber,
        logs: {
          create: {
            title: initialLogTitle,
          },
        },
      } as Prisma.ComplaintUncheckedCreateInput,
    });

    if (uploadImageUrls.length > 0) {
      for (const imageUrl of uploadImageUrls) {
        await this.prisma.complaintPhoto.create({
          data: {
            complaintId: complaint.id,
            imageUrl: imageUrl,
          },
        });
      }
    }
    return {
      message: 'complaint added sucessfully',
      complaint,
    };
  }

  // create complaint by tenant
  async createComplaintByTenant(
    tenentId: number,
    dto: CreateComplaintDto,
    images?: Express.Multer.File[],
  ) {
    const tenant = await this.prisma.user.findUnique({
      where: { id: tenentId },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException();
    const activeTenancy = await this.prisma.tenancy.findFirst({
      where: {
        tenentId: tenant.id,
        tenancyStatus: TenancyStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        propertyId: true,
        room: {
          select: {
            roomNumber: true,
          },
        },
      },
    });
    if (!activeTenancy)
      throw new BadRequestException('No active tenancy found for this tenant');

    let uploadImages: string[] = [];
    if (images && images.length > 0) {
      for (const image of images) {
        const url = await this.s3Service.uploadFile(
          image,
          this.COMPLAINT_S3_FOLDER_NAME,
        );
        uploadImages.push(url);
      }
    }

    const complaint = await this.prisma.complaint.create({
      data: {
        title: dto.title,
        description: dto.description,
        raisedById: tenant.id,
        status: ComplaintStatus.OPEN,
        propertyId: activeTenancy.propertyId,
        roomNumber: activeTenancy.room.roomNumber,
        requestedVisitDate: dto.requestedVisitDate
          ? new Date(`${dto.requestedVisitDate}T00:00:00`)
          : null,
        requestedVisitTime: dto.requestedVisitTime
          ? new Date(`1970-01-01T${dto.requestedVisitTime}`)
          : null,
        priority: dto.priority ?? MaintenancePriority.URGENT,
        logs: {
          create: {
            title: 'complaint created',
          },
        },
      },
    });

    if (uploadImages.length > 0) {
      for (const imageUrl of uploadImages) {
        await this.prisma.complaintPhoto.create({
          data: {
            imageUrl: imageUrl,
            complaintId: complaint.id,
          },
        });
      }
    }

    return {
      message: 'complaint created sucessfully',
      complaint,
    };
  }

  async getAllComplaints(propertyId: number) {
    const complaints = await this.prisma.complaint.findMany({
      where: { propertyId },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        property: {
          select: {
            name: true,
            id: true,
          },
        },
        roomNumber: true,
        requestedVisitDate: true,
        requestedVisitTime: true,
        priority: true,
        images: true,
        logs: true,
        raisedBy: {
          select: {
            fullName: true,
          },
        },
        ...this.assigneeSelect,
        createdAt: true,
      },
    });
    return complaints;
  }

  async getComplaintById(complaintId: number) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
      select: {
        id: true,
        title: true,
        description: true,
        raisedBy: { select: { fullName: true } },
        status: true,
        property: { select: { name: true, id: true } },
        requestedVisitDate: true,
        requestedVisitTime: true,
        priority: true,
        roomNumber: true,
        ...this.assigneeSelect,
        logs: { orderBy: { createdAt: 'asc' } },
        images: true,
      },
    });
    if (!complaint) {
      throw new NotFoundException('complaint not found');
    }
    return complaint;
  }

  async assignMaintenanceStaff(
    ownerUserId: number,
    complaintId: number,
    options: { staffProfileId?: number; assignToSelf?: boolean },
  ) {
    const complaint = (await this.prisma.complaint.findUnique({
      where: { id: complaintId },
      select: {
        id: true,
        propertyId: true,
        assignedOwnerId: true,
        assignedMaintenanceStaffProfile: {
          select: {
            user: { select: { fullName: true } },
            jobPosition: true,
          },
        },
      },
    })) as ComplaintAssignmentContext | null;
    if (!complaint) throw new NotFoundException('Complaint not found');

    const property = await this.prisma.property.findFirst({
      where: { id: complaint.propertyId, ownerId: ownerUserId },
      select: { id: true },
    });
    if (!property) {
      throw new ForbiddenException(
        'You can only assign complaints for your own properties',
      );
    }

    const previousAssigneeName =
      await this.resolvePreviousAssigneeName(complaint);

    if (options.assignToSelf) {
      const owner = await this.prisma.user.findUnique({
        where: { id: ownerUserId },
        select: { fullName: true },
      });
      const newAssigneeName = this.formatOwnerAssigneeName(owner);
      const logTitle = newAssigneeName
        ? this.buildAssignmentLogTitle(previousAssigneeName, newAssigneeName)
        : 'Assigned to property owner';

      await this.prisma.complaint.update({
        where: { id: complaintId },
        data: this.buildAssignToOwnerUpdate(ownerUserId),
      });
      await this.prisma.complaintActivityLog.create({
        data: {
          complaintId,
          title: logTitle,
        },
      });
      return { message: 'Complaint assigned to you successfully' };
    }

    if (!options.staffProfileId) {
      throw new BadRequestException(
        'Provide staffProfileId or set assignToSelf to true',
      );
    }

    const staffBook = await this.prisma.employeeBook.findFirst({
      where: {
        ownerId: ownerUserId,
        employeeProfileId: options.staffProfileId,
      },
      select: { id: true },
    });
    if (!staffBook) {
      throw new ForbiddenException('Staff not found or access denied');
    }

    const staff = await this.prisma.maintenanceStaffProfile.findUnique({
      where: { id: options.staffProfileId },
      select: {
        user: { select: { fullName: true } },
        jobPosition: true,
      },
    });
    const newAssigneeName = this.formatStaffAssigneeName(staff);
    const logTitle = newAssigneeName
      ? this.buildAssignmentLogTitle(previousAssigneeName, newAssigneeName)
      : 'Assigned to staff member';

    await this.prisma.complaint.update({
      where: { id: complaintId },
      data: this.buildAssignToStaffUpdate(options.staffProfileId),
    });
    await this.prisma.complaintActivityLog.create({
      data: {
        complaintId,
        title: logTitle,
      },
    });

    return {
      message: 'staff assigned sucessfully',
    };
  }

  async changeStatus(
    userRequestedStatus: ComplaintStatus,
    complaintId: number,
  ) {
    try {
      return await this.prisma.complaint.update({
        where: { id: complaintId },
        data: { status: userRequestedStatus },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Complaint not found');
      }
      throw error;
    }
  }

  async fetchComplaintByStatus(
    userRequestedStatus: ComplaintStatus,
    propertyId: number,
  ) {
    return await this.prisma.complaint.findMany({
      where: { status: userRequestedStatus, propertyId: propertyId },
    });
  }

  async fetchAllComplaintsCreatedByTenant(tenantId: number) {
    const exists = await this.prisma.user.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('tenant not found');
    const result = await this.prisma.complaint.findMany({
      where: {
        raisedById: tenantId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        images: true,
        logs: true,
        requestedVisitDate: true,
        requestedVisitTime: true,
        priority: true,
        assignedMaintenanceStaffProfile: {
          select: {
            whatsAppNumber: true,
            phoneNumber: true,
            user: { select: { fullName: true } },
          },
        },
      },
    });
    return result;
  }

  async editComplaintByTenant(
    tenantId: number,
    complaintId: number,
    dto: EditComplaintByTenantDto,
  ) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
      select: { id: true, raisedById: true, status: true, title: true },
    });

    if (!complaint) throw new NotFoundException('Complaint not found');

    if (complaint.raisedById !== tenantId) {
      throw new ForbiddenException('You can only edit your own complaints');
    }

    const nonEditableStatuses: ComplaintStatus[] = [
      ComplaintStatus.ASSIGNED,
      ComplaintStatus.IN_PROGRESS,
      ComplaintStatus.COMPLETED,
      ComplaintStatus.CANCELLED,
    ];
    if (nonEditableStatuses.includes(complaint.status)) {
      throw new BadRequestException(
        `Complaint cannot be edited once it is ${complaint.status.toLowerCase().replace('_', ' ')}`,
      );
    }

    const updateData: Prisma.ComplaintUpdateInput = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.requestedVisitDate !== undefined) {
      updateData.requestedVisitDate = dto.requestedVisitDate
        ? new Date(`${dto.requestedVisitDate}T00:00:00`)
        : null;
    }
    if (dto.requestedVisitTime !== undefined) {
      updateData.requestedVisitTime = dto.requestedVisitTime
        ? new Date(`1970-01-01T${dto.requestedVisitTime}`)
        : null;
    }

    const updated = await this.prisma.complaint.update({
      where: { id: complaintId },
      data: updateData,
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        status: true,
        requestedVisitDate: true,
        requestedVisitTime: true,
        updatedAt: true,
      },
    });

    return { message: 'Complaint updated successfully', complaint: updated };
  }

  async addLogs(complaintId: number, log: AddLogsDto) {
    const exists = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
    });
    if (!exists) throw new NotFoundException('complaint not found');
    const result = await this.prisma.complaintActivityLog.create({
      data: {
        title: log.title,
        complaintId: complaintId,
      },
    });
    return result;
  }

  async getComplaintSummaryByProperty(propertyId: number, ownerUserId: number) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, ownerId: ownerUserId },
      select: { id: true },
    });
    if (!property) throw new NotFoundException('Property not found');

    const counts = await this.prisma.complaint.groupBy({
      by: ['status'],
      where: { propertyId },
      _count: { id: true },
    });

    const summary = {
      open: 0,
      assigned: 0,
      resolved: 0,
      total: 0,
    };

    for (const row of counts) {
      const count = row._count.id;
      summary.total += count;
      if (row.status === ComplaintStatus.OPEN) summary.open = count;
      else if (row.status === ComplaintStatus.ASSIGNED) summary.assigned = count;
      else if (row.status === ComplaintStatus.COMPLETED) summary.resolved = count;
    }

    return summary;
  }

  async fetchAllComplaintsForAllPropertiesByOwnerId(propertyOwnerId: number) {
    const owner = await this.prisma.user.findUnique({
      where: { id: propertyOwnerId },
    });
    if (!owner) {
      throw new NotFoundException('owner not found or blocked');
    }

    const allPropertiesOfOwner = await this.prisma.property.findMany({
      where: {
        ownerId: propertyOwnerId,
      },
      select: {
        id: true,
      },
    });

    const allPropertyIds = allPropertiesOfOwner.map((p) => p.id);
    const complaints = await this.prisma.complaint.findMany({
      where: {
        propertyId: { in: allPropertyIds },
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        property: {
          select: {
            name: true,
            id: true,
          },
        },
        roomNumber: true,
        requestedVisitDate: true,
        requestedVisitTime: true,
        priority: true,
        images: true,
        logs: true,
        raisedBy: {
          select: {
            fullName: true,
          },
        },
        ...this.assigneeSelect,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });
    return complaints;
  }
}
