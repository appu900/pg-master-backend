import {
  Controller,
  Body,
  Get,
  Post,
  Put,
  UseGuards,
  Param,
  UnauthorizedException,
  ForbiddenException,
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
import { UserRole } from '@prisma/client';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ComplaintCreateByOwnerDto } from './dto/create.complaint-by-owner.dto';
import { ChnageComplaintStatus } from './dto/change.status.dto';
import { assignMaintenanceStaffDto } from './dto/assign-staff.dto';
import { AddLogsDto } from './dto/addLogs.dto';

@Controller('complaint')
export class ComplaintController {
  constructor(private readonly complaintService: ComplaintService) {}

  @Post('/by/tenant')
  @Roles(Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(FilesInterceptor('images'))
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
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(FilesInterceptor('images'))
  async createComplaint(
    @Body() dto: ComplaintCreateByOwnerDto,
    @UploadedFiles() images: Express.Multer.File[],
    @GetUser() user: any,
  ) {
    const ownerId = user.userId;
    if (!ownerId) throw new UnauthorizedException();
    return await this.complaintService.createComplaintByOwner(
      ownerId,
      dto,
      images,
    );
  }

  @Get(':complaintId')
  @Roles(Role.PROPERTY_OWNER, Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getComplaintById(
    @Param('complaintId', ParseIntPipe) complaintId: number,
  ) {
    return this.complaintService.getComplaintById(complaintId);
  }

  @Get('/property/:propertyId')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getAllComplaints(@Param('propertyId',ParseIntPipe) propertyId:number) {
    return this.complaintService.getAllComplaints(propertyId);
  }

  @Put('status')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async changeStatus(@Body() dto: ChnageComplaintStatus) {
    return this.complaintService.changeStatus(dto.status, dto.complaintId);
  }

  @Put('assign-staff')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async assignMaintenanceStaff(@Body() dto: assignMaintenanceStaffDto) {
    return this.complaintService.assignMaintenanceStaff(
      dto.complaintId,
      dto.staffProfileId,
    );
  }

  @Get('/raisedby/tenant')
  @Roles(Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async fetchAllComplaintsByTenant(@GetUser() user: any) {
    const tenantId = user.userId;
    if (!tenantId) throw new UnauthorizedException();
    return this.complaintService.fetchAllComplaintsCreatedByTenant(tenantId);
  }



  @Post('/log/:complaintId')
  @Roles(Role.PROPERTY_OWNER,Role.TENANT)
  @UseGuards(JwtAuthGuard,RolesGuard)
  async addLogs(@Body() dto:AddLogsDto,@Param('complaintId', ParseIntPipe) compaintId:number){
      return this.complaintService.addLogs(compaintId,dto)
  }

}
