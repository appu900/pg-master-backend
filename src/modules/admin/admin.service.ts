import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { BusinessApprovalStatus } from '@prisma/client';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async fetchAllPendingBusinessProfile(adminId: number) {
    const adminExists = await this.prisma.user.findUnique({
      where: { id: adminId },
    });
    if (!adminExists) throw new ForbiddenException();
    const result = await this.prisma.businessDetails.findMany({
      where: { status: BusinessApprovalStatus.PENDING },
      select: {
        id:true,
        businessName:true,
        businessType:true,
        aadhaarCard:true,
        panCard:true,
        companyDocument:true,
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
    return result;
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
        'cannot perform this operation. Either record not found or not pending.',
      );
    return { message: 'Business appropved sucessfully' };
  }

  async rejectBusiness(businessId: number,reason?:string) {
    const result = await this.prisma.businessDetails.updateMany({
      where: {
        id: businessId,
        status: BusinessApprovalStatus.PENDING,
      },
      data: {
        status: BusinessApprovalStatus.REJECTED,
        rejectionReason: reason ?? ''
      },
    });

    if (result.count === 0)
      throw new BadRequestException(
        'cannot perform this operation. Either record not found or not pending.',
      );
    return { message: 'Business appropved sucessfully' };
  }
}
