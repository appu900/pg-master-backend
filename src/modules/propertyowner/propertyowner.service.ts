import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BusinessApprovalStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { S3Service } from 'src/infra/s3/s3.service';
import { AddBusinessDetails } from './dto/AddBusiness-details.dto';
import { UpdatePropertyOwnerProfileDto } from './dto/update-property-owner.profile.dto';
import { UpdateTenantProfileByOwnerDto } from './dto/update-tenant_profile.dto';

@Injectable()
export class PropertyownerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async updateProfile(
    propertyOwnerId: number,
    editProfilePayload: UpdatePropertyOwnerProfileDto,
    profileImage?: Express.Multer.File,
  ) {
    const existingProfile = await this.prisma.propertyOwnerProfile.findUnique({
      where: { userId: propertyOwnerId },
    });
    if (!existingProfile) throw new NotFoundException('profile not found');

    let newProfileImageUrl: string | undefined;
    if (profileImage) {
      newProfileImageUrl = await this.s3Service.uploadFile(
        profileImage,
        `propertyOnwer-profiles/${propertyOwnerId}`,
      );
    }

    const userupdateData: Prisma.UserUpdateInput = {};
    if (editProfilePayload.phoneNumber)
      userupdateData.phoneNumber = editProfilePayload.phoneNumber;
    if (editProfilePayload.email)
      userupdateData.email = editProfilePayload.email;
    if (editProfilePayload.fullName)
      userupdateData.fullName = editProfilePayload.fullName;

    const profileUpdateData: Prisma.PropertyOwnerProfileUpdateInput = {};
    if (editProfilePayload.Gender)
      profileUpdateData.Gender = editProfilePayload.Gender;
    if (editProfilePayload.Profession)
      profileUpdateData.Profession = editProfilePayload.Profession;
    if (editProfilePayload.pinCode)
      profileUpdateData.pinCode = editProfilePayload.pinCode;
    if (editProfilePayload.State)
      profileUpdateData.State = editProfilePayload.State;
    if (newProfileImageUrl)
      profileUpdateData.profileImage = newProfileImageUrl;

    const hasUserChanges = Object.keys(userupdateData).length > 0;
    const hasProfileChanges = Object.keys(profileUpdateData).length > 0;

    if (!hasProfileChanges && !hasUserChanges) {
      return this.fetchProfileDetails(propertyOwnerId);
    }

    try {
      const updatedProfileDataResponse = await this.prisma.$transaction(
        async (tx) => {
          if (hasUserChanges) {
            await tx.user.update({
              where: { id: propertyOwnerId },
              data: userupdateData,
            });
          }
          if (hasProfileChanges) {
            await tx.propertyOwnerProfile.update({
              where: { userId: propertyOwnerId },
              data: profileUpdateData,
            });
          }
          return tx.propertyOwnerProfile.findUnique({
            where: { userId: propertyOwnerId },
            select: {
              user: {
                select: {
                  fullName: true,
                  phoneNumber: true,
                  email: true,
                },
              },
              profileImage: true,
              State: true,
              Profession: true,
              pinCode: true,
              Gender: true,
            },
          });
        },
      );

      if (newProfileImageUrl && existingProfile.profileImage) {
        try {
          await this.s3Service.deleteFile(existingProfile.profileImage);
        } catch (error: any) {
          console.error(
            `failed to delete old profile image for owner ${propertyOwnerId}: ${error.message}`,
          );
        }
      }

      return { success: true, data: updatedProfileDataResponse };
    } catch (error: any) {
      // If DB transaction fails and we uploaded a new image, clean it up
      if (newProfileImageUrl) {
        try {
          await this.s3Service.deleteFile(newProfileImageUrl);
        } catch (cleanupError: any) {
          console.error(
            `failed to clean up orphaned profile image for owner ${propertyOwnerId}: ${cleanupError.message}`,
          );
        }
      }
      if (error?.code === 'P2002') {
        throw new BadRequestException('Email is already in use by another account');
      }
      throw error;
    }
  }


  async fetchProfileDetails(onwerId: number) {
    return this.prisma.propertyOwnerProfile.findFirst({
      where: { userId: onwerId },
      select: {
        user: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            email: true,
          },
        },
        profileImage: true,
        State: true,
        Profession: true,
        pinCode: true,
        Gender: true,
        businessDetails: true,
        BankAcconts: true,
      },
    });
  }

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
          status: BusinessApprovalStatus.PENDING,
          propertyOwnerProfileId: profileId,
          aadhaarCard: aadhaarUrl,
          panCard: panUrl,
          companyDocument: companyDocUrl,
        },
      });
    });
  }

  async fetchTheBuinessDetails(propertyOwnerId:number){
     const propertyOwner = await this.prisma.user.findUnique({
      where:{id:propertyOwnerId},
      select:{
        propertyOwnerProfile:true
      }
     })
     if(!propertyOwner || !propertyOwner.propertyOwnerProfile){
       throw new NotFoundException("user not found")
     }

    const buisnessDetails  = await this.prisma.businessDetails.findUnique({
      where:{
        propertyOwnerProfileId:propertyOwner.propertyOwnerProfile.id
      }
    })
    return buisnessDetails;
  }

  async updateTenantProfile(
    ownerUseId: number,
    tenantUserId: number,
    dto: UpdateTenantProfileByOwnerDto,
    profileImage?: Express.Multer.File,
  ) {
    const tenantProfile = await this.prisma.tenentProfile.findUnique({
      where: { userId: tenantUserId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });
    if (!tenantProfile) {
      throw new NotFoundException(`Tenant profile not found`);
    }
    const tenancy = await this.prisma.tenancy.findFirst({
      where: { tenentId: tenantUserId, property: { ownerId: ownerUseId } },
      select: { id: true },
    });

    if (!tenancy) {
      throw new ForbiddenException('permission denied');
    }

    let newProfileImageUrl: string | undefined;
    if (profileImage) {
      newProfileImageUrl = await this.s3Service.uploadFile(
        profileImage,
        `tenant-profile/${tenantUserId}`,
      );
      if (tenantProfile.profileImage) {
        try {
          await this.s3Service.deleteFile(tenantProfile.profileImage);
        } catch (error) {
          console.error('can not delete tenant profile image');
        }
      }
    }

    const tenantProfileUpdateData: Prisma.TenentProfileUncheckedUpdateInput =
      {};
    const userUpdateData: Prisma.UserUncheckedUpdateInput = {};

    if (dto.gender) tenantProfileUpdateData.geneder = dto.gender;
    if (dto.state) tenantProfileUpdateData.state = dto.state;
    if (dto.profession) tenantProfileUpdateData.profession = dto.profession;
    if (dto.pinCode) tenantProfileUpdateData.pinCode = dto.pinCode;
    if (dto.permanentAddress)
      tenantProfileUpdateData.Address = dto.permanentAddress;
    if (newProfileImageUrl)
      tenantProfileUpdateData.profileImage = newProfileImageUrl;

    if (dto.fullName) userUpdateData.fullName = dto.fullName;
    if (dto.phoneNumber) userUpdateData.phoneNumber = dto.phoneNumber;
    if (dto.email) userUpdateData.email = dto.email;

    const hasProfileChanges = Object.keys(tenantProfileUpdateData).length > 0;
    const hasUserChnages = Object.keys(userUpdateData).length > 0;

    console.log(hasProfileChanges);
    console.log(hasUserChnages);

    if (!hasProfileChanges && !hasUserChnages) {
      throw new BadRequestException('no fileds provided to update');
    }

    const updatedTenantProfileDetails = await this.prisma.$transaction(
      async (tx) => {
        if (hasUserChnages) {
          await tx.user.update({
            where: { id: tenantUserId },
            data: userUpdateData,
          });
        }

        if (hasProfileChanges) {
          await tx.tenentProfile.update({
            where: { userId: tenantUserId },
            data: tenantProfileUpdateData,
          });
        }

        const updatedProfile = await tx.tenentProfile.findUnique({
          where: { userId: tenantUserId },
          select: {
            user: {
              select: {
                fullName: true,
                phoneNumber: true,
                email: true,
              },
            },
            profileImage: true,
            state: true,
            profession: true,
            geneder: true,
            pinCode: true,
            Address: true,
          },
        });
        return updatedProfile;
      },
    );

    return updatedTenantProfileDetails;
  }
}
