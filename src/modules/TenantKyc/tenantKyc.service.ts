import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { S3Service } from 'src/infra/s3/s3.service';

@Injectable()
export class TenantKycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  async uploadKycDocuments(
    tenantUserId: number,
    files: {
      idProof?: Express.Multer.File[];
      rentalAgreement?: Express.Multer.File[];
      policeVerification?: Express.Multer.File[];
      otherDocument?: Express.Multer.File[];
    },
  ) {
    const tenant = await this.prisma.user.findUnique({
      where: { id: tenantUserId },
      select: {
        tenentProfile: true,
      },
    });
    console.log("this is tenant data",tenant)
    console.log("this is tenant profile",tenant?.tenentProfile)
    if (!tenant || !tenant.tenentProfile) throw new NotFoundException('tenant not found');
  
    const tenantPofileId = tenant.tenentProfile.id;
    const exisingKycDocument = await this.prisma.tenantKycDetails.findFirst({
      where: { tenantProfileId: tenantPofileId },
    });

    const uploadData: any = {};
    if (files.idProof?.[0]) {
      const url = await this.s3.uploadFile(
        files.idProof[0],
        'tenant-kyc/id-proof',
      );
      uploadData.idProof = url;
    }
    if (files.rentalAgreement?.[0]) {
      const rentalUrl = await this.s3.uploadFile(
        files.rentalAgreement[0],
        'tenant-kyc/rental-agreement',
      );
      uploadData.rentalAgreement = rentalUrl;
    }
    if (files.policeVerification?.[0]) {
      const policeUrl = await this.s3.uploadFile(
        files.policeVerification[0],
        'tenant-kyc/police-verification',
      );
      uploadData.policeVerification = policeUrl;
    }

    if (files.otherDocument?.[0]) {
      const otherdocumentUrl = await this.s3.uploadFile(
        files.otherDocument[0],
        'tenant-kyc/otherDocument',
      );
      uploadData.otherDocument = otherdocumentUrl;
    }

    if (exisingKycDocument) {
      return this.prisma.tenantKycDetails.update({
        where: { tenantProfileId: tenantPofileId },
        data: uploadData,
      });
    }

    return this.prisma.tenantKycDetails.create({
      data: {
        tenantProfileId: tenantPofileId,
        ...uploadData,
      },
    });
  }


  async fetchKycDetailsOfTenant(tenantUserId:number){
    const tenant = await this.prisma.user.findUnique({
      where:{id:tenantUserId},
      include:{
        tenentProfile:true
      }
    })
    if(!tenant) throw new NotFoundException("tenant not found")
    if(!tenant.tenentProfile) throw new NotFoundException("tenant profile not found")
    const tenantProfileId = tenant.tenentProfile.id
    const kycDetails = await this.prisma.tenantKycDetails.findUnique({
      where:{tenantProfileId:tenantProfileId},
    })
    return kycDetails
    
  }
}
