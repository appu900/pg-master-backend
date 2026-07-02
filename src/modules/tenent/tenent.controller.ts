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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UPLOAD_FILE_SIZE_LIMITS } from 'src/common/constants/upload.constants';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MoveOutTenantDto } from './dto/move-out-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenentService } from './tenent.service';
import { GetUser } from 'src/common/decorators/Getuser.decorator';
import { RequestMoveOutDto } from './dto/request-moveout.dto';
import { RequestRoomShiftDto } from './dto/request-room-shift.dto';
import { StaffService } from '../staff/staff.service';

@Controller('tenant')
export class TenentController {
  constructor(
    private readonly tenentService: TenentService,
    private readonly staffService: StaffService,
  ) {}

  @Get('/room/:roomId')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getTenantsInRoom(
    @Param('roomId', ParseIntPipe) roomId: number,
    @GetUser() user: any,
  ) {
    return this.tenentService.getTenantsByRoom(roomId);
  }

  @Get('/property/:propertyId')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getTenantsByProperty(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @GetUser() user: any,
  ) {
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffPropertyAccess(user.userId, propertyId);
    }
    return this.tenentService.getTenantsByProperty(propertyId);
  }

  @Get('/property/:propertyId/stats')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getTenantStats(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @GetUser() user: any,
  ) {
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffPropertyAccess(user.userId, propertyId);
    }
    return this.tenentService.getTenantStats(propertyId);
  }

  @Get('/property/:propertyId/search')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async searchTenants(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query('q') searchQuery: string,
    @GetUser() user: any,
  ) {
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffPropertyAccess(user.userId, propertyId);
    }
    return this.tenentService.searchTenants(propertyId, searchQuery || '');
  }

  @Get('/tenancy/details')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TENANT)
  async fetchTenancyDetails(@GetUser() user: any) {
    return this.tenentService.fetchTenancyDetails(user.userId);
  }

  @Patch('/profile')
  @Roles(Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(
    FileInterceptor('profileImage', { limits: UPLOAD_FILE_SIZE_LIMITS }),
  )
  async editProfile(
    @GetUser() user: any,
    @Body() dto: UpdateTenantDto,
    @UploadedFile() profileImage?: Express.Multer.File,
  ) {
    return this.tenentService.editProfileByTenant(
      user.userId,
      dto,
      profileImage,
    );
  }

  @Get('/:tenantId')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getTenantById(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @GetUser() user: any,
  ) {
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffTenantUserAccess(user.userId, tenantId);
    }
    return this.tenentService.getTenantById(tenantId);
  }

  @Patch('/:tenantId')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(
    FileInterceptor('profileImage', { limits: UPLOAD_FILE_SIZE_LIMITS }),
  )
  async updateTenant(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Body() dto: UpdateTenantDto,
    @UploadedFile() profileImage?: Express.Multer.File,
  ) {
    return this.tenentService.updateTenant(tenantId, dto, profileImage);
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

  @Post('/room-shift-request')
  @Roles(Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async requestRoomShift(@GetUser() user: any, @Body() dto: RequestRoomShiftDto) {
    return this.tenentService.requestRoomShift(user.userId, dto);
  }

  @Get('/room-shift-request/me')
  @Roles(Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getMyRoomShiftRequest(@GetUser() user: any) {
    return this.tenentService.getMyRoomShiftRequest(user.userId);
  }

  @Get('/room-shift/available-rooms')
  @Roles(Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getAvailableRoomsForShift(
    @GetUser() user: any,
    @Query('propertyId', ParseIntPipe) propertyId: number,
  ) {
    return this.tenentService.getAvailableRoomsForShift(user.userId, propertyId);
  }
}
