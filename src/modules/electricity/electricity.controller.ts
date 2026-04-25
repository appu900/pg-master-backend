import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { GetUser } from 'src/common/decorators/Getuser.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ElectricityService } from './electricity.service';

@Controller('electricity')
export class ElectricityController {
  constructor(private readonly electricityService: ElectricityService) {}

  @Get('/rooms/:propertyId')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getRoomsWithMeter(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @GetUser() user: any,
  ) {
    return this.electricityService.getRoomsWithMeter(propertyId, user.userId);
  }
}
