import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  UseGuards
} from '@nestjs/common';
import { GetUser } from 'src/common/decorators/Getuser.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminService } from './admin.service';
import { BusinessRejectionReasonDto } from './dto/business-rejection.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('/business/pending')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async fetchAllPendingBusinessDetails(@GetUser() user: any) {
    const userId = user.userId;
    return this.adminService.fetchAllPendingBusinessProfile(userId);
  }

  @Put('business/approve/:businessId')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async approveBusiness(@Param('businessId', ParseIntPipe) businessId: number) {
    if (!businessId) throw new BadRequestException('business Id is required');
    return this.adminService.approveBusiness(businessId);
  }

  @Put('business/reject/:businessId')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async rejectBusiness(
    @Param('businessId', ParseIntPipe) businessId: number,
    @Body() dto: BusinessRejectionReasonDto,
  ) {
    if (!businessId) throw new BadRequestException('business Id is required');
    return this.adminService.rejectBusiness(businessId, dto.description);
  }

  @Get('/platform-stats')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getPlatformStats() {
    return this.adminService.getPlatformStats();
  }

  @Get('/properties')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getAllProperties() {
    return this.adminService.getAllPropertiesForAdmin();
  }

  @Get('/properties/:propertyId/full-stats')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getPropertyFullStats(
    @Param('propertyId', ParseIntPipe) propertyId: number,
  ) {
    return this.adminService.getPropertyFullStats(propertyId);
  }

  @Get('/properties/:propertyId')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getPropertyDetails(
    @Param('propertyId', ParseIntPipe) propertyId: number,
  ) {
    return this.adminService.getPropertyDetailsForAdmin(propertyId);
  }

}
