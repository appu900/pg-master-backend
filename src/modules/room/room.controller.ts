import {
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
import { AddTenantDto } from './dto/add.tenant.dto';
import { RoomService } from './room.service';

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
    return 'api not working';
  }

  @Get('/tenants/:id')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getAlltenantsOfRoom(@Param('id', ParseIntPipe) roomId: number) {
    return this.roomService.fetchAllTenantsOfRoom(roomId);
  }

  @Delete('/:id')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async deleteRoom(
    @Param('id', ParseIntPipe) roomId: number,
    @GetUser() user: any,
  ) {
    return this.roomService.deleteRoom(roomId, user.userId);
  }
}
