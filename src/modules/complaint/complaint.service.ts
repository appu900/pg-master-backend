import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { ComplaintCreateByOwnerDto } from './dto/create.complaint-by-owner.dto';
import {
  ComplaintStatus,
  MaintenancePriority,
  TenancyStatus,
  TenantStatus,
  UserRole,
} from '@prisma/client';
import { CreateComplaintDto } from './dto/create-.complaint-by-tenent.dto';
import { S3Service } from 'src/infra/s3/s3.service';
import { error } from 'console';
import { Prisma } from '@prisma/client';
import { AddLogsDto } from './dto/addLogs.dto';

@Injectable()
export class ComplaintService {
  private readonly COMPLAINT_S3_FOLDER_NAME = 'complaints';
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

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

    const complaint = await this.prisma.complaint.create({
      data: {
        title: dto.title,
        description: dto.description,
        raisedById: dto.tenantId,
        propertyId: dto.propertyId,
        assignedMaintenanceStaffProfileId:
          dto.assignedMaintenanceStaffProfileId ?? null,
        status: dto.status as ComplaintStatus,
        roomNumber: dto.roomNumber,
        logs: {
          create: {
            title: 'complaint raised',
          },
        },
      },
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
        tenancyStatus:TenancyStatus.ACTIVE,
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
        assignedMaintenanceStaffProfile: {
          select: {
            user: {
              select: { fullName: true, phoneNumber: true },
            },
            whatsAppNumber: true,
          },
        },
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
        assignedMaintenanceStaffProfile: {
          select: { user: { select: { fullName: true } } },
        },
        logs: true,
        images: true,
      },
    });
    if (!complaint) {
      throw new NotFoundException('complaint not found');
    }
    return complaint;
  }

  async assignMaintenanceStaff(complaintId: number, staffProfileId: number) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
    });
    const staff = await this.prisma.maintenanceStaffProfile.findUnique({
      where: { id: staffProfileId },
    });
    if (!staff) throw new NotFoundException('staff not found');
    if (!complaint) throw new NotFoundException();
    await this.prisma.complaint.update({
      where: { id: complaintId },
      data: {
        assignedMaintenanceStaffProfileId: staffProfileId,
        status: ComplaintStatus.ASSIGNED,
      },
    });
    // **TODO add notification here to send this event to the staff whatsapp
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
    console.log(allPropertyIds)
    const complaints = await this.prisma.complaint.findMany({
      where: {
        propertyId: { in: allPropertyIds },
      },
      include: {
        property: true,
        raisedBy: true,
        assignedMaintenanceStaffProfile: true,
        logs: true,
        images: true,
      },
      orderBy:{
        createdAt:'desc'
      },
      take:100
    });
    return complaints
  }
}
