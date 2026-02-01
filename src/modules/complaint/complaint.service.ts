import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { ComplaintCreateByOwnerDto } from './dto/create.complaint-by-owner.dto';
import { ComplaintStatus, UserRole } from '@prisma/client';
import { CreateComplaintDto } from './dto/create-.complaint-by-tenent.dto';

@Injectable()
export class ComplaintService {
  constructor(private readonly prisma: PrismaService) {}

  async createComplaintByOwner(
    ownerId: number,
    dto: ComplaintCreateByOwnerDto,
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

    const complaint = await this.prisma.complaint.create({
      data: {
        title: dto.title,
        description: dto.description,
        raisedById: dto.tenantId,
        propertyId: dto.propertyId,
        assignedMaintenanceStaffProfileId:
          dto.assignedMaintenanceStaffProfileId ?? null,
        status: dto.assignedMaintenanceStaffProfileId
          ? ComplaintStatus.ASSIGNED
          : ComplaintStatus.OPEN,
        roomNumber: dto.roomNumber,
        logs: {
          create: {
            title: 'complaint raised',
          },
        },
      },
    });
    return complaint;
  }


  async createByTenant(tenantId:number,dto:CreateComplaintDto){

  }
}
