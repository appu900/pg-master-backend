import { DueService } from './due.service';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { GetUser } from 'src/common/decorators/Getuser.decorator';
import {
  CreateDueForRoomDto,
  CreateDueForTenantDto,
} from './dto/create.due.dto';
import { CollectDueDto } from './dto/collect-due.dto';
import { BulkReminderDto } from './dto/bulk-reminder.dto';
import { StaffService } from '../staff/staff.service';

@Controller('dues')
export class DuesController {
  constructor(
    private readonly dueService: DueService,
    private readonly staffService: StaffService,
  ) {}

  @Post('/property/:propertyId/tenant')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async addDueToTenant(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() dto: CreateDueForTenantDto,
    @GetUser() user: any,
  ) {
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffFinanceModuleAccess(
        user.userId,
        propertyId,
        'editDues',
      );
    }
    return this.dueService.addDueToTenant(dto, propertyId);
  }

  @Post('/property/:propertyId/room')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async addDueToRoom(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() dto: CreateDueForRoomDto,
    @GetUser() user: any,
  ) {
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffFinanceModuleAccess(
        user.userId,
        propertyId,
        'editDues',
      );
      await this.staffService.validateStaffRoomBelongsToProperty(
        user.userId,
        dto.roomId,
        propertyId,
      );
    }
    return this.dueService.addDueToRoom(dto, propertyId);
  }

  @Get('/tenant/:tenantId')
  @Roles(Role.PROPERTY_OWNER, Role.TENANT, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async fetchTenantDuesByTenancyId(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @GetUser() user: any,
  ) {
    // tenantId here is the tenant's userId (tenentId on Tenancy), not tenancy PK.
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffTenantFinanceViewAccess(
        user.userId,
        tenantId,
      );
    }
    return this.dueService.fetchAllDuesByTenantId(tenantId);
  }

  @Get('/tenant/:tenantId/all')
  @Roles(Role.PROPERTY_OWNER, Role.TENANT, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getAllTenantDues(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @GetUser() user: any,
  ) {
    // tenantId here is the tenant's userId (tenentId on Tenancy), not tenancy PK.
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffTenantFinanceViewAccess(
        user.userId,
        tenantId,
      );
    }
    return this.dueService.getTenantDuesByTenancyId(tenantId);
  }

  @Get('/property/:propertyId/unpaid')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getUnpaidDuesByProperty(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @GetUser() user: any,
  ) {
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffPropertyUnpaidDuesAccess(
        user.userId,
        propertyId,
      );
    }
    return this.dueService.getUnpaidDuesByProperty(propertyId);
  }

  @Get('/tenant/:tenantId/unpaid')
  @Roles(Role.PROPERTY_OWNER, Role.TENANT, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getUnpaidDuesByTenant(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @GetUser() user: any,
  ) {
    // tenantId here is the tenant's userId, not tenancy PK.
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffTenantFinanceViewAccess(
        user.userId,
        tenantId,
      );
    }
    return this.dueService.getUnpaidDuesByTenantId(tenantId);
  }

  @Get('/tenant/:tenantId/property/:propertyId')
  @Roles(Role.PROPERTY_OWNER, Role.TENANT, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getDuesByTenantAndProperty(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @GetUser() user: any,
  ) {
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffTenantDuesReadAccess(
        user.userId,
        propertyId,
      );
    }
    return this.dueService.getDuesByTenantAndProperty(tenantId, propertyId);
  }

  @Post('/collect')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async collectDue(@Body() dto: CollectDueDto, @GetUser() user: any) {
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffDueFinanceAccess(
        user.userId,
        dto.dueId,
        'collectPayments',
      );
    }
    // Staff userId is intentionally used as recordedById for audit tracing.
    return this.dueService.collectDue(dto, user.userId);
  }

  @Get('/property/:propertyId/collections')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getPropertyCollections(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @GetUser() user: any,
  ) {
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffFinanceModuleAccess(
        user.userId,
        propertyId,
        'viewDues',
      );
    }
    return this.dueService.getPropertyCollections(propertyId);
  }

  @Post('/property/:propertyId/bulk-remind')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async sendBulkReminder(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() dto: BulkReminderDto,
    @GetUser() user: any,
  ) {
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffFinanceModuleAccess(
        user.userId,
        propertyId,
        'viewDues',
      );
    }
    return this.dueService.sendBulkReminder(propertyId, dto);
  }

  @Get('/:dueId')
  @Roles(Role.PROPERTY_OWNER, Role.TENANT, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getDueById(
    @Param('dueId', ParseIntPipe) dueId: number,
    @GetUser() user: any,
  ) {
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffDueFinanceAccess(
        user.userId,
        dueId,
        'viewDues',
      );
    }
    return this.dueService.getDueById(dueId);
  }
}



