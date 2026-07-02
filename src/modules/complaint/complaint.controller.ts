import {
  Controller,
  Body,
  Get,
  Patch,
  Post,
  Put,
  UseGuards,
  Param,
  Query,
  UnauthorizedException,
  BadRequestException,
  UseInterceptors,
  UploadedFiles,
  ParseIntPipe,
} from '@nestjs/common';
import { ComplaintService } from './complaint.service';
import { CreateComplaintDto } from './dto/create-.complaint-by-tenent.dto';
import { GetUser } from 'src/common/decorators/Getuser.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UPLOAD_FILE_SIZE_LIMITS } from 'src/common/constants/upload.constants';
import { ComplaintCreateByOwnerDto } from './dto/create.complaint-by-owner.dto';
import { ChnageComplaintStatus } from './dto/change.status.dto';
import { assignMaintenanceStaffDto } from './dto/assign-staff.dto';
import { AddLogsDto } from './dto/addLogs.dto';
import { EditComplaintByTenantDto } from './dto/edit-complaint-by-tenant.dto';
import { StaffService } from '../staff/staff.service';

@Controller('complaint')
export class ComplaintController {
  constructor(
    private readonly complaintService: ComplaintService,
    private readonly staffService: StaffService,
  ) {}

  @Post('/by/tenant')
  @Roles(Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(
    FilesInterceptor('images', 10, { limits: UPLOAD_FILE_SIZE_LIMITS }),
  )
  async crateComplaintByTenant(
    @Body() dto: CreateComplaintDto,
    @UploadedFiles() images: Express.Multer.File[],
    @GetUser() user: any,
  ) {
    const tenentId = user.userId;
    if (!tenentId) throw new UnauthorizedException();
    return this.complaintService.createComplaintByTenant(tenentId, dto, images);
  }

  @Post('/by/owner')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(
    FilesInterceptor('images', 10, { limits: UPLOAD_FILE_SIZE_LIMITS }),
  )
  async createComplaint(
    @Body() dto: ComplaintCreateByOwnerDto,
    @UploadedFiles() images: Express.Multer.File[],
    @GetUser() user: any,
  ) {
    let ownerId = user.userId;
    if (!ownerId) throw new UnauthorizedException();
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffComplaintsModuleAccess(
        user.userId,
        dto.propertyId,
        'add',
      );
      ownerId = await this.staffService.resolveOwnerFromStaff(user.userId);
    }
    return await this.complaintService.createComplaintByOwner(ownerId, dto, images);
  }

  @Get('/summary/property/:propertyId')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getComplaintSummary(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @GetUser() user: any,
  ) {
    let effectiveOwnerId = user.userId;
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffComplaintsModuleAccess(
        user.userId,
        propertyId,
        'view',
      );
      effectiveOwnerId = await this.staffService.resolveOwnerFromStaff(user.userId);
    }
    return this.complaintService.getComplaintSummaryByProperty(propertyId, effectiveOwnerId);
  }

  @Get(':complaintId')
  @Roles(Role.PROPERTY_OWNER, Role.TENANT, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getComplaintById(
    @Param('complaintId', ParseIntPipe) complaintId: number,
    @GetUser() user: any,
  ) {
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffComplaintModuleAccess(
        user.userId,
        complaintId,
        'view',
      );
    }
    return this.complaintService.getComplaintById(complaintId);
  }

  @Get('/property/:propertyId')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getAllComplaints(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @GetUser() user: any,
  ) {
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffComplaintsModuleAccess(
        user.userId,
        propertyId,
        'view',
      );
    }
    return this.complaintService.getAllComplaints(propertyId);
  }

  @Put('status')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async changeStatus(@Body() dto: ChnageComplaintStatus, @GetUser() user: any) {
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffComplaintModuleAccess(
        user.userId,
        dto.complaintId,
        'handle',
      );
    }
    return this.complaintService.changeStatus(dto.status, dto.complaintId);
  }

  @Put('assign-staff')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async assignMaintenanceStaff(
    @Body() dto: assignMaintenanceStaffDto,
    @GetUser() user: any,
  ) {
    return this.complaintService.assignMaintenanceStaff(user.userId, dto.complaintId, {
      staffProfileId: dto.staffProfileId,
      assignToSelf: dto.assignToSelf,
    });
  }

  @Get('/raisedby/tenant')
  @Roles(Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async fetchAllComplaintsByTenant(
    @GetUser() user: any,
    @Query('propertyId') propertyId?: string,
  ) {
    const tenantId = user.userId;
    if (!tenantId) throw new UnauthorizedException();
    const parsedPropertyId = propertyId ? Number(propertyId) : undefined;
    if (propertyId && Number.isNaN(parsedPropertyId)) {
      throw new BadRequestException('Invalid propertyId');
    }
    return this.complaintService.fetchAllComplaintsCreatedByTenant(
      tenantId,
      parsedPropertyId,
    );
  }

  @Put('/:complaintId/edit')
  @Roles(Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(
    FilesInterceptor('images', 10, { limits: UPLOAD_FILE_SIZE_LIMITS }),
  )
  async editComplaint(
    @Param('complaintId', ParseIntPipe) complaintId: number,
    @Body() dto: EditComplaintByTenantDto,
    @UploadedFiles() images: Express.Multer.File[],
    @GetUser() user: any,
  ) {
    return this.complaintService.editComplaintByTenant(
      user.userId,
      complaintId,
      dto,
      images,
    );
  }

  @Post('/log/:complaintId')
  @Roles(Role.PROPERTY_OWNER, Role.TENANT, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async addLogs(
    @Body() dto: AddLogsDto,
    @Param('complaintId', ParseIntPipe) compaintId: number,
    @GetUser() user: any,
  ) {
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffComplaintModuleAccess(
        user.userId,
        compaintId,
        'handle',
      );
    }
    return this.complaintService.addLogs(compaintId, dto);
  }

  @Post(':complaintId/photos')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(
    FilesInterceptor('images', 10, { limits: UPLOAD_FILE_SIZE_LIMITS }),
  )
  async addComplaintPhotos(
    @Param('complaintId', ParseIntPipe) complaintId: number,
    @UploadedFiles() images: Express.Multer.File[],
    @GetUser() user: any,
  ) {
    let ownerId = user.userId;
    if (!ownerId) throw new UnauthorizedException();
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffComplaintModuleAccess(
        user.userId,
        complaintId,
        'handle',
      );
      ownerId = await this.staffService.resolveOwnerFromStaff(user.userId);
    }
    return this.complaintService.addComplaintPhotos(
      ownerId,
      complaintId,
      images,
    );
  }

  @Get('owner/property/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER)
  async fetchAllComplaintsbyPropertyOwner(@GetUser() user: any) {
    const propertyOwnerUserId = user.userId;
    console.log('this is propertyownerId', propertyOwnerUserId);
    const res =
      await this.complaintService.fetchAllComplaintsForAllPropertiesByOwnerId(
        propertyOwnerUserId,
      );
    return {
      success: true,
      message: 'fetched all complaints',
      res,
    };
  }
}
