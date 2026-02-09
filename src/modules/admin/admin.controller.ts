import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { GetUser } from 'src/common/decorators/Getuser.decorator';
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
    return this.adminService.rejectBusiness(businessId);
  }
}
