import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { TenantKycService } from './tenantKyc.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { GetUser } from 'src/common/decorators/Getuser.decorator';
import { UPLOAD_FILE_SIZE_LIMITS } from 'src/common/constants/upload.constants';
import { StaffService } from '../staff/staff.service';

@Controller('tenantkyc')
export class TenantKycController {
  constructor(
    private readonly tenentKycService: TenantKycService,
    private readonly staffService: StaffService,
  ) {}

  @Post(':tenantUserId/kyc')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF, Role.TENANT)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'idProof', maxCount: 1 },
        { name: 'rentalAgreement', maxCount: 1 },
        { name: 'policeVerification', maxCount: 1 },
        { name: 'otherDocument', maxCount: 1 },
      ],
      { limits: UPLOAD_FILE_SIZE_LIMITS },
    ),
  )
  async uploadKycDocumentsByOwner(
    @Param('tenantUserId', ParseIntPipe) tenantUserId: number,
    @GetUser() user: any,
    @UploadedFiles()
    files: {
      idProof?: Express.Multer.File[];
      rentalAgreement?: Express.Multer.File[];
      policeVerification?: Express.Multer.File[];
      otherDocument?: Express.Multer.File[];
    },
  ) {
    if (!tenantUserId) throw new BadRequestException('tenant id is required');
    const userId = user.userId;
    const userRole = user.role;

    if (userRole === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffTenantUserModuleAccess(
        user.userId,
        tenantUserId,
        'edit',
      );
      const result = await this.tenentKycService.uploadKycDocuments(
        tenantUserId,
        files,
      );
      return {
        success: true,
        message: 'Kyc documented upload sucessfully',
        result,
      };
    }

    if (userRole === Role.PROPERTY_OWNER) {
      const result = await this.tenentKycService.uploadKycDocuments(
        tenantUserId,
        files,
      );
      return {
        success: true,
        message: 'Kyc documented upload sucessfully',
        result,
      };
    }

    if (userRole === Role.TENANT) {
      if (userId !== tenantUserId) throw new ForbiddenException('acess denied');
      const result = await this.tenentKycService.uploadKycDocuments(
        tenantUserId,
        files,
      );
      return {
        success: true,
        message: 'Kyc document upload sucessfully',
        result,
      };
    }
  }

  @Get(':tenantUserId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF, Role.TENANT)
  async fetchKycDetailsOfTenant(
    @Param('tenantUserId', ParseIntPipe) tenantUserId: number,
    @GetUser() user: any,
  ) {
    if (!tenantUserId) throw new BadRequestException('tenant id is required');
    const userId = user.userId;
    const userRole = user.role;

    if (userRole === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffTenantUserModuleAccess(
        user.userId,
        tenantUserId,
        'view',
      );
      const result =
        await this.tenentKycService.fetchKycDetailsOfTenant(tenantUserId);
      return {
        success: true,
        message: 'kyc documents fetched',
        result,
      };
    }

    if (userRole === Role.PROPERTY_OWNER) {
      const result =
        await this.tenentKycService.fetchKycDetailsOfTenant(tenantUserId);
      return {
        success: true,
        message: 'kyc documents fetched',
        result,
      };
    }

    if (userRole === Role.TENANT) {
      if (tenantUserId !== userId)
        throw new ForbiddenException('Access denied');
      const result =
        await this.tenentKycService.fetchKycDetailsOfTenant(tenantUserId);
      return {
        success: true,
        message: 'Kyc documents fetched',
        result,
      };
    }
  }
}
