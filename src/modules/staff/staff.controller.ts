import {
  Controller,
  Post,
  Get,
  Delete,
  UseGuards,
  Body,
  Patch,
  BadRequestException,
  UnauthorizedException,
  ParseIntPipe,
  Param,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from 'src/common/enum/role.enum';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CreateStaffDto } from './dto/create.staff.dto';
import { GetUser } from 'src/common/decorators/Getuser.decorator';
import { EditStaffAccessDto } from './dto/edit-Staff_Access.dto';
import { EditEmployeeProfileDto } from './dto/edit.staff.profile.dto';
import { UpdateStaffAppPermissionsDto } from './dto/update-app-permissions.dto';

@Controller('staff')
export class StaffController {
  constructor(private readonly maintenanceStaffService: StaffService) {}

  @Post('')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async addMaintenanceStaff(@Body() dto: CreateStaffDto, @GetUser() user: any) {
    let ownerId = user.userId;
    if (!ownerId) throw new BadRequestException('please login again and try');
    if (user.role === Role.MAINTENANCE_STAFF) {
      ownerId = await this.maintenanceStaffService.validateStaffManageStaffModuleAccess(
        user.userId,
        'add',
      );
    }
    return this.maintenanceStaffService.createMaintenanceStaff(ownerId, dto);
  }

  @Get('profile/:id')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getStaffDetails(
    @Param('id', ParseIntPipe) staffProfileId: number,
    @GetUser() user: any,
  ) {
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.maintenanceStaffService.validateStaffManageStaffProfileAccess(
        user.userId,
        staffProfileId,
        'view',
      );
    }
    return this.maintenanceStaffService.getStaffDetailsById(staffProfileId);
  }

  @Get('owner')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getAllMaintenanceStaffOfaOwner(@GetUser() user: any) {
    let ownerId = user.userId;
    if (!ownerId) throw new BadRequestException('please login and try again');
    if (user.role === Role.MAINTENANCE_STAFF) {
      ownerId = await this.maintenanceStaffService.validateStaffManageStaffModuleAccess(
        user.userId,
        'view',
      );
    }
    return this.maintenanceStaffService.getMaintenanceStaffsByOwner(ownerId);
  }

  @Get('/by/property/:propertyId')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async fetchAllStaffsForProperty(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @GetUser() user: any,
  ) {
    let ownerId = user.userId;
    if (!ownerId || !propertyId) throw new BadRequestException();
    if (user.role === Role.MAINTENANCE_STAFF) {
      const addAllowed =
        await this.maintenanceStaffService
          .validateStaffComplaintsModuleAccess(user.userId, propertyId, 'add')
          .then(() => true)
          .catch(() => false);
      if (!addAllowed) {
        await this.maintenanceStaffService.validateStaffComplaintsModuleAccess(
          user.userId,
          propertyId,
          'handle',
        );
      }
      ownerId = await this.maintenanceStaffService.resolveOwnerFromStaff(
        user.userId,
      );
    }
    return this.maintenanceStaffService.fetchAllocatedStaffByPropertyId(
      propertyId,
      ownerId,
    );
  }

  @Patch('/property/access')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async editPropertyPermission(
    @Body() dto: EditStaffAccessDto,
    @GetUser() user: any,
  ) {
    let ownerId = user.userId;
    if (!ownerId) throw new UnauthorizedException();
    if (user.role === Role.MAINTENANCE_STAFF) {
      ownerId =
        await this.maintenanceStaffService.validateStaffManageStaffProfileAccess(
          user.userId,
          dto.staffProfileId,
          'edit',
        );
    }
    return this.maintenanceStaffService.editStaffAccess(ownerId, dto);
  }

  @Patch('profile')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async editEmpProfile(
    @Body() dto: EditEmployeeProfileDto,
    @GetUser() user: any,
  ) {
    let ownerId = user.userId;
    if (!ownerId) throw new UnauthorizedException();
    if (user.role === Role.MAINTENANCE_STAFF) {
      ownerId =
        await this.maintenanceStaffService.validateStaffManageStaffProfileAccess(
          user.userId,
          dto.empProfileId,
          'edit',
        );
    }
    return this.maintenanceStaffService.editMaintenanceStaffProfile(
      dto,
      ownerId,
      dto.empProfileId,
    );
  }

  @Get('user/:userId/expenses')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getStaffExpenses(
    @Param('userId', ParseIntPipe) userId: number,
    @GetUser() user: any,
  ) {
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.maintenanceStaffService.validateStaffManageStaffUserAccess(
        user.userId,
        userId,
        'view',
      );
    }
    return this.maintenanceStaffService.getExpensesByStaffUserId(userId);
  }

  @Get('user/:userId/collections')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getStaffCollections(
    @Param('userId', ParseIntPipe) userId: number,
    @GetUser() user: any,
  ) {
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.maintenanceStaffService.validateStaffManageStaffUserAccess(
        user.userId,
        userId,
        'view',
      );
    }
    return this.maintenanceStaffService.getPaymentsCollectedByStaff(userId);
  }

  @Get('property/:propertyId/collections')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getPropertyStaffCollections(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @GetUser() user: any,
  ) {
    let ownerId = user.userId;
    if (user.role === Role.MAINTENANCE_STAFF) {
      ownerId =
        await this.maintenanceStaffService.validateStaffManageStaffPropertyAccess(
          user.userId,
          propertyId,
          'view',
        );
    }
    return this.maintenanceStaffService.getStaffCollectionSummaryByProperty(
      propertyId,
      ownerId,
    );
  }

  @Delete(':id')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async deleteStaff(
    @Param('id', ParseIntPipe) staffProfileId: number,
    @GetUser() user: any,
  ) {
    let ownerId = user.userId;
    if (!ownerId) throw new UnauthorizedException();
    if (user.role === Role.MAINTENANCE_STAFF) {
      ownerId =
        await this.maintenanceStaffService.validateStaffManageStaffDeleteAccess(
          user.userId,
          staffProfileId,
        );
    }
    return this.maintenanceStaffService.deleteStaff(ownerId, staffProfileId);
  }

  @Patch('app-permissions')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async updateStaffAppPermissions(
    @Body() dto: UpdateStaffAppPermissionsDto,
    @GetUser() user: any,
  ) {
    let ownerId = user.userId;
    if (!ownerId) throw new UnauthorizedException();
    if (user.role === Role.MAINTENANCE_STAFF) {
      ownerId =
        await this.maintenanceStaffService.validateStaffManageStaffProfileAccess(
          user.userId,
          dto.staffProfileId,
          'edit',
        );
    }
    return this.maintenanceStaffService.updateStaffAppPermissions(ownerId, dto);
  }

  @Get('me')
  @Roles(Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getStaffSelfProfile(@GetUser() user: any) {
    const userId = user.userId;
    if (!userId) throw new UnauthorizedException();
    return this.maintenanceStaffService.getStaffSelfProfile(userId);
  }
}
