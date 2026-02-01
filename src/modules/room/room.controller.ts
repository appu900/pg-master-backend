import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  Get,
} from '@nestjs/common';
import { RoomService } from './room.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { AddRoomDto } from '../property/dto/AddRoom.dto';
import { AddTenantDto } from './dto/add.tenant.dto';

@Controller('room')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post('/tenant/:id')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async addTenentToRoom(
    @Param('id', ParseIntPipe) roomId: number,
    @Body() dto: AddTenantDto,
  ) {
    return this.roomService.addTenant(roomId, dto);
  }

  @Get('/tenants/:id')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getAlltenantsOfRoom(@Param('id', ParseIntPipe) roomId: number) {
    return this.roomService.fetchAllTenantsOfRoom(roomId);
  }
}
