import {
  Controller,
  Body,
  Get,
  Post,
  UseGuards,
  UnauthorizedException,
  ForbiddenException,
  UseInterceptors,
  UploadedFiles,
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

  @Get('')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getAllComplaints() {
    return this.complaintService.getAllComplaints();
  }
}
