import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { CreateAdminDto } from '../auth/dto/create-admin.dto';
import { AddBusinessDetails } from './dto/AddBusiness-details.dto';
import { NotFound } from '@aws-sdk/client-s3';
import { BusinessApprovalStatus, UserRole } from '@prisma/client';
import { S3Service } from 'src/infra/s3/s3.service';

@Injectable()
export class PropertyownerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async addBusinessDetails(
    propertyOwnerId: number,
    dto: AddBusinessDetails,
    files: Express.Multer.File[],
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: propertyOwnerId, role: UserRole.PROPERTY_OWNER },
      select: { propertyOwnerProfile: true },
    });
    if (!user || !user.propertyOwnerProfile) {
      throw new NotFoundException('user not found');
    }

    const profileId = user.propertyOwnerProfile.id;
    const existingBusniessDetails =
      await this.prisma.businessDetails.findUnique({
        where: { propertyOwnerProfileId: profileId },
      });
    if (existingBusniessDetails) {
      throw new BadRequestException('Business details already submitted');
    }

    const aadhaarFile = files.find((f) => f.fieldname === 'aadhaar');
    const panFile = files.find((f) => f.fieldname === 'pan');
    const companyDocFile = files.find((f) => f.fieldname === 'companyDocument');

    if (!aadhaarFile || !panFile) {
      throw new BadRequestException('Aadhaar and PAN files are required');
    }
    const [aadhaarUrl, panUrl, companyDocUrl] = await Promise.all([
      this.s3Service.uploadFile(aadhaarFile, 'business/aadhaar'),
      this.s3Service.uploadFile(panFile, 'business/pan'),
      companyDocFile
        ? this.s3Service.uploadFile(companyDocFile, 'business/company-docs')
        : Promise.resolve(null),
    ]);
    return this.prisma.$transaction(async (tx) => {
      return tx.businessDetails.create({
        data: {
          businessName: dto.businessName,
          businessType: dto.businessType,
          status:BusinessApprovalStatus.PENDING,
          propertyOwnerProfileId: profileId,
          aadhaarCard: aadhaarUrl,
          panCard: panUrl,
          companyDocument: companyDocUrl,
        },
      });
    });
  }
}
