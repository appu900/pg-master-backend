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

@Controller('dues')
export class DuesController {
  constructor(private readonly dueService: DueService) {}

  @Post('/property/:propertyId/tenant')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async addDueToTenant(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() dto: CreateDueForTenantDto,
  ) {
    return this.dueService.addDueToTenant(dto, propertyId);
  }

  @Post('/property/:propertyId/room')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async addDueToRoom(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() dto: CreateDueForRoomDto,
  ) {
    return this.dueService.addDueToRoom(dto, propertyId);
  }

  @Get('/tenant/:tenantId')
  @Roles(Role.PROPERTY_OWNER, Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async fetchTenantDuesByTenancyId(
    @Param('tenantId', ParseIntPipe) tenantId: number,
  ) {
    return this.dueService.fetchAllDuesByTenantId(tenantId);
  }

  @Get('/tenant/:tenantId/all')
  @Roles(Role.PROPERTY_OWNER, Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getAllTenantDues(@Param('tenantId', ParseIntPipe) tenantId: number) {
    return this.dueService.getTenantDuesByTenancyId(tenantId);
  }

  @Get('/property/:propertyId/unpaid')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getUnpaidDuesByProperty(
    @Param('propertyId', ParseIntPipe) propertyId: number,
  ) {
    return this.dueService.getUnpaidDuesByProperty(propertyId);
  }

  @Get('/tenant/:tenantId/unpaid')
  @Roles(Role.PROPERTY_OWNER, Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getUnpaidDuesByTenant(
    @Param('tenantId', ParseIntPipe) tenantId: number,
  ) {
    return this.dueService.getUnpaidDuesByTenantId(tenantId);
  }

  @Post('/collect')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async collectDue(@Body() dto: CollectDueDto, @GetUser() user: any) {
    return this.dueService.collectDue(dto, user.userId);
  }

  @Get('/property/:propertyId/collections')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getPropertyCollections(
    @Param('propertyId', ParseIntPipe) propertyId: number,
  ) {
    return this.dueService.getPropertyCollections(propertyId);
  }
}
