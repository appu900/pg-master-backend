import {
  Controller,
  Post,
  Get,
  UseGuards,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from 'src/common/enum/role.enum';
import { UserRole } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CreateStaffDto } from './dto/create.staff.dto';
import { GetUser } from 'src/common/decorators/Getuser.decorator';

@Controller('staff')
export class StaffController {
  constructor(private readonly maintenanceStaffService: StaffService) {}

  @Post('')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async addMaintenanceStaff(@Body() dto: CreateStaffDto, @GetUser() user: any) {
    const userId = user.userId;
    if (!userId) throw new BadRequestException('please login again and try');
    return this.maintenanceStaffService.createMaintenanceStaff(userId, dto);
  }

  @Get('owner')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getAllMaintenanceStaffOfaOwner(@GetUser() user: any) {
    const userId = user.userId;
    if (!userId) throw new BadRequestException('please login and try again');
    return this.maintenanceStaffService.getMaintenanceStaffsByOwner(userId);
  }
}
