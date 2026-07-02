import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from 'src/common/decorators/Getuser.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { StaffService } from '../staff/staff.service';
import { AddTenantDto } from './dto/add.tenant.dto';
import { RoomService } from './room.service';

@Controller('room')
export class RoomController {
  constructor(
    private readonly roomService: RoomService,
    private readonly staffService: StaffService,
  ) {}

  @Post('/tenant/:id')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async addTenentToRoom(
    @Param('id', ParseIntPipe) roomId: number,
    @Body() _dto: AddTenantDto,
    @GetUser() user: any,
  ) {
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffRoomInventoryAccess(user.userId, roomId, 'edit');
    }
    return 'api not working';
  }

  @Get('/tenants/:id')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getAlltenantsOfRoom(
    @Param('id', ParseIntPipe) roomId: number,
    @GetUser() user: any,
  ) {
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffRoomInventoryAccess(user.userId, roomId, 'view');
    }
    return this.roomService.fetchAllTenantsOfRoom(roomId);
  }

  @Delete('/:id')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async deleteRoom(
    @Param('id', ParseIntPipe) roomId: number,
    @GetUser() user: any,
  ) {
    if (!user.userId) throw new BadRequestException();
    let effectiveOwnerId = user.userId;
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffRoomInventoryAccess(user.userId, roomId, 'delete');
      effectiveOwnerId = await this.staffService.resolveOwnerFromStaff(user.userId);
    }
    return this.roomService.deleteRoom(roomId, effectiveOwnerId);
  }
}
