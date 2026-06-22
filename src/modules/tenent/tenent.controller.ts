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
import { MoveOutTenantDto } from './dto/move-out-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenentService } from './tenent.service';
import { GetUser } from 'src/common/decorators/Getuser.decorator';
import { RequestMoveOutDto } from './dto/request-moveout.dto';

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

  @Get('/tenancy/details')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TENANT)
  async fetchTenancyDetails(@GetUser() user: any) {
    return this.tenentService.fetchTenancyDetails(user.userId);
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

  // propertyId is now required so the owner specifies which tenancy to exit
  @Delete('/:tenantId/property/:propertyId')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async deleteTenant(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @GetUser() user: any,
  ) {
    return this.tenentService.deleteTenant(tenantId, propertyId, user.userId);
  }

  // owner revokes an exited tenancy back to active
  @Patch('/tenancy/:tenancyId/revoke')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async revokeTenancyExit(
    @Param('tenancyId', ParseIntPipe) tenancyId: number,
    @GetUser() user: any,
  ) {
    return this.tenentService.revokeTenancyExit(tenancyId, user.userId);
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

  // tenant requests their own moveout
  @Post('/moveout-request')
  @Roles(Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async requestMoveOut(@GetUser() user: any, @Body() dto: RequestMoveOutDto) {
    return this.tenentService.requestMoveOut(user.userId, dto);
  }

  // tenant views their own moveout request
  @Get('/moveout-request/me')
  @Roles(Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getMyMoveOutRequest(@GetUser() user: any) {
    return this.tenentService.getMyMoveOutRequest(user.userId);
  }
}
