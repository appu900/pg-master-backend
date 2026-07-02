import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { TenancyService } from './tenancy.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { GetUser } from 'src/common/decorators/Getuser.decorator';
import { EditTenancyDto } from './dto/update-tenancy.dto';
import { AddTenantDto } from './dto/add.tenant.dto';
import { ShiftRoomDto } from './dto/shift-room.dto';
import { RejectMoveOutDto } from './dto/reject-moveout.dto';
import { RejectRoomShiftDto } from './dto/reject-room-shift.dto';
import { MoveOutTenantDto } from './dto/move-out-tenant.dto';
import { StaffService } from '../staff/staff.service';

@Controller('tenancy')
export class TenancyController {
  constructor(
    private readonly tenancyService: TenancyService,
    private readonly staffService: StaffService,
  ) {}

  @Post('onboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  async onBoardTenancy(@Body() dto: AddTenantDto, @GetUser() user: any) {
    let effectiveOwnerId = user.userId;
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffPropertyAccess(user.userId, dto.propertyId);
      effectiveOwnerId = await this.staffService.resolveOwnerFromStaff(user.userId);
    }
    const res = await this.tenancyService.createTenant(dto, effectiveOwnerId);
    return { message: 'Tenant created successfully', res };
  }

  @Post('shift-room')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  async shiftTenantRoom(@Body() dto: ShiftRoomDto, @GetUser() user: any) {
    let effectiveOwnerId = user.userId;
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffTenancyAccess(user.userId, dto.tenancyId);
      effectiveOwnerId = await this.staffService.resolveOwnerFromStaff(user.userId);
    }
    return this.tenancyService.shiftTenantRoom(dto, effectiveOwnerId);
  }

  @Put('/:tenancyId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  async updateTenancyDetails(
    @Body() dto: EditTenancyDto,
    @GetUser() user: any,
    @Param('tenancyId', ParseIntPipe) tenancyId: number,
  ) {
    let effectiveOwnerId = user.userId;
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffTenancyAccess(user.userId, tenancyId);
      effectiveOwnerId = await this.staffService.resolveOwnerFromStaff(user.userId);
    }
    const res = await this.tenancyService.updateTenancyDetails(
      tenancyId,
      effectiveOwnerId,
      dto,
    );
    return { res, message: 'Update rental details successful' };
  }

  // put an active tenant on notice period
  @Post('/:tenancyId/notice-period')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER)
  async putOnNoticePeriod(
    @Param('tenancyId', ParseIntPipe) tenancyId: number,
    @GetUser() user: any,
    @Body() dto: MoveOutTenantDto,
  ) {
    return this.tenancyService.putOnNoticePeriod(tenancyId, user.userId, dto);
  }

  // revert notice period — tenant stays active
  @Post('/:tenancyId/cancel-notice')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER)
  async cancelNoticePeriod(
    @Param('tenancyId', ParseIntPipe) tenancyId: number,
    @GetUser() user: any,
  ) {
    return this.tenancyService.cancelNoticePeriod(tenancyId, user.userId);
  }

  // list all pending moveout requests for a property
  @Get('/moveout-requests/property/:propertyId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  async getMoveOutRequests(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @GetUser() user: any,
  ) {
    let effectiveOwnerId = user.userId;
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffPropertyAccess(user.userId, propertyId);
      effectiveOwnerId = await this.staffService.resolveOwnerFromStaff(user.userId);
    }
    return this.tenancyService.getMoveOutRequests(propertyId, effectiveOwnerId);
  }

  // get full details of a single moveout request (with tenant dues)
  @Get('/moveout-request/:requestId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER)
  async getMoveOutRequestDetails(
    @Param('requestId', ParseIntPipe) requestId: number,
    @GetUser() user: any,
  ) {
    return this.tenancyService.getMoveOutRequestDetails(requestId, user.userId);
  }

  // approve a moveout request → tenancy goes to NOTICE_PERIOD
  @Post('/moveout-request/:requestId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER)
  async approveMoveOutRequest(
    @Param('requestId', ParseIntPipe) requestId: number,
    @GetUser() user: any,
  ) {
    return this.tenancyService.approveMoveOutRequest(requestId, user.userId);
  }

  // reject a moveout request with optional reason
  @Post('/moveout-request/:requestId/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER)
  async rejectMoveOutRequest(
    @Param('requestId', ParseIntPipe) requestId: number,
    @GetUser() user: any,
    @Body() dto: RejectMoveOutDto,
  ) {
    return this.tenancyService.rejectMoveOutRequest(
      requestId,
      user.userId,
      dto,
    );
  }

  @Get('/room-shift-requests/property/:propertyId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER)
  async getRoomShiftRequests(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @GetUser() user: any,
  ) {
    return this.tenancyService.getRoomShiftRequests(propertyId, user.userId);
  }

  @Get('/room-shift-request/:requestId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER)
  async getRoomShiftRequestDetails(
    @Param('requestId', ParseIntPipe) requestId: number,
    @GetUser() user: any,
  ) {
    return this.tenancyService.getRoomShiftRequestDetails(
      requestId,
      user.userId,
    );
  }

  @Post('/room-shift-request/:requestId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER)
  async approveRoomShiftRequest(
    @Param('requestId', ParseIntPipe) requestId: number,
    @GetUser() user: any,
  ) {
    return this.tenancyService.approveRoomShiftRequest(requestId, user.userId);
  }

  @Post('/room-shift-request/:requestId/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER)
  async rejectRoomShiftRequest(
    @Param('requestId', ParseIntPipe) requestId: number,
    @GetUser() user: any,
    @Body() dto: RejectRoomShiftDto,
  ) {
    return this.tenancyService.rejectRoomShiftRequest(
      requestId,
      user.userId,
      dto,
    );
  }

  @Post('/:tenancyId/confirm-move-in')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER)
  async confirmMoveIn(
    @Param('tenancyId', ParseIntPipe) tenancyId: number,
    @GetUser() user: any,
  ) {
    return this.tenancyService.confirmMoveIn(tenancyId, user.userId);
  }

  @Get('/move-in-history/property/:propertyId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER)
  async getMoveInHistory(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @GetUser() user: any,
  ) {
    return this.tenancyService.getMoveInHistory(propertyId, user.userId);
  }

  @Get('/move-out-history/property/:propertyId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER)
  async getMoveOutHistory(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @GetUser() user: any,
  ) {
    return this.tenancyService.getMoveOutHistory(propertyId, user.userId);
  }

  @Get('/recently-deleted/:propertyId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER)
  @HttpCode(HttpStatus.OK)
  async fetchRecentlyDeletedTenants(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @GetUser() user: any,
  ) {
    if (!propertyId) throw new BadRequestException();
    const res = await this.tenancyService.fetchRecentlyDeletedTenants(
      propertyId,
      user.userId,
    );
    return {
      messsage: 'fetched all recently deleted tenants for this property',
      res,
    };
  }



  @Put('/reactive-tenancy/:tenancyId/property/:propertyId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER)
  async reactivateTenancy(
    @Param('tenancyId', ParseIntPipe) tenancyId: number,
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @GetUser() user: any,
  ) {
    return this.tenancyService.reActiveTenancy(
      propertyId,
      user.userId,
      tenancyId
    );
  }
}
