import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AddTenantDto } from '../room/dto/add.tenant.dto';
import { MoveOutTenantDto } from './dto/move-out-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenentService } from './tenent.service';
import { GetUser } from 'src/common/decorators/Getuser.decorator';

@Controller('tenant')
export class TenentController {
  constructor(private readonly tenentService: TenentService) {}



  @Get('/room/:roomId')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getTenantsInRoom(@Param('roomId', ParseIntPipe) roomId: number) {
    return this.tenentService.getTenantsByRoom(roomId);
  }

  @Get('/property/:propertyId')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getTenantsByProperty(
    @Param('propertyId', ParseIntPipe) propertyId: number,
  ) {
    return this.tenentService.getTenantsByProperty(propertyId);
  }

  @Get('/property/:propertyId/stats')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getTenantStats(@Param('propertyId', ParseIntPipe) propertyId: number) {
    return this.tenentService.getTenantStats(propertyId);
  }

  @Get('/property/:propertyId/search')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async searchTenants(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query('q') searchQuery: string,
  ) {
    return this.tenentService.searchTenants(propertyId, searchQuery || '');
  }

  @Get('/:tenantId')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getTenantById(@Param('tenantId', ParseIntPipe) tenantId: number) {
    return this.tenentService.getTenantById(tenantId);
  }

  @Patch('/:tenantId')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async updateTenant(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenentService.updateTenant(tenantId, dto);
  }

  @Delete('/:tenantId')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async deleteTenant(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @GetUser() user: any,
  ) {
    return this.tenentService.deleteTenant(tenantId, user.userId);
  }

  @Post('/tenancy/:tenancyId/moveout')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async moveTenantOut(
    @Param('tenancyId', ParseIntPipe) tenancyId: number,
    @Body() dto: MoveOutTenantDto,
  ) {
    return this.tenentService.moveTenantOut(tenancyId, dto);
  }

  @Get('/tenancy/details')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TENANT)
  async fetchTenancyDetails(@GetUser() user: any) {
    const userId = user.userId;
    return this.tenentService.fetchTenancyDetails(userId);
  }
}
