import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { GetUser } from 'src/common/decorators/Getuser.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AddBusinessDetails } from './dto/AddBusiness-details.dto';
import { UpdatePropertyOwnerProfileDto } from './dto/update-property-owner.profile.dto';
import { UpdateTenantProfileByOwnerDto } from './dto/update-tenant_profile.dto';
import { PropertyownerService } from './propertyowner.service';

@Controller('propertyowner')
export class PropertyownerController {
  constructor(private readonly serviceLayer: PropertyownerService) {}

  @Post('business-details')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'aadhaar', maxCount: 1 },
        { name: 'pan', maxCount: 1 },
        { name: 'companyDocument', maxCount: 1 },
      ],
      {
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
          const allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'application/pdf',
          ];
          if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(
              new BadRequestException('Only jPG,PNG and PDF is allowed'),
              false,
            );
          }
          cb(null, true);
        },
      },
    ),
  )
  async addBusinessDetails(
    @Body() dto: AddBusinessDetails,
    @UploadedFiles()
    files: {
      aadhaar?: Express.Multer.File[];
      pan?: Express.Multer.File[];
      companyDocument?: Express.Multer.File[];
    },
    @GetUser() user: any,
  ) {
    const propertyOwnerId = user.userId;
    if (!propertyOwnerId) throw new BadRequestException('Invalid user');
    const uploadedFiles: Express.Multer.File[] = [
      ...(files.aadhaar ?? []),
      ...(files.pan ?? []),
      ...(files.companyDocument ?? []),
    ];
    return this.serviceLayer.addBusinessDetails(
      propertyOwnerId,
      dto,
      uploadedFiles,
    );
  }

  @Get('/profile')
  @UseGuards(JwtAuthGuard)
  async fetchProfile(@GetUser() user: any) {
    const userId = user.userId;
    if (!userId) throw new BadRequestException('Invalid user');
    return this.serviceLayer.fetchProfileDetails(userId);
  }

  @Put('/profile')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER)
  @UseInterceptors(
    FileInterceptor('profileImage', {
      limits: {
        fileSize: 40 * 1024 * 1024,
      },
    }),
  )
  async updateProfile(
    @Body() dto: UpdatePropertyOwnerProfileDto,
    @GetUser() user: any,
    @UploadedFile() profileImage?: Express.Multer.File,
  ) {
    const propertyOwnerId = user.userId;
    if (!propertyOwnerId) throw new BadRequestException('Invalid user');
    return this.serviceLayer.updateProfile(propertyOwnerId, dto, profileImage);
  }

  @Put('tenants/:tenantUserId/profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER)
  @UseInterceptors(
    FileInterceptor('profileImage', { limits: { fileSize: 40 * 1024 * 1024 } }),
  )
  async updateTenantProfile(
    @Body() dto: UpdateTenantProfileByOwnerDto,
    @Param('tenantUserId', ParseIntPipe) tenantId: number,
    @GetUser() user: any,
    @UploadedFile() profileImage?: Express.Multer.File,
  ) {
    const userId = user.userId;
    if (!userId) throw new BadRequestException();
    if (!tenantId) throw new BadRequestException('tenant id is required');
    const updatedProfile = await this.serviceLayer.updateTenantProfile(
      userId,
      tenantId,
      dto,
      profileImage,
    );
    return {
      success: true,
      message: 'Tenant profile update sucessfully',
      data: updatedProfile,
    };
  }

  
  @Get('/buisnessdetails')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER)
  async fetchBuinessDetails(@GetUser() user: any) {
    const propertyOwnerUserId = user.userId;
    const res = this.serviceLayer.fetchProfileDetails(propertyOwnerUserId);
    return {
      success: true,
      message: 'buisness details fetched sucessfully',
      res,
    };
  }
}
