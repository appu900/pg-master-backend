import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { GetUser } from 'src/common/decorators/Getuser.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SubmitAllReadingsDto } from './dto/submit-all-readings.dto';
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

  @Get('/meter-readings/:propertyId')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getMeterReadingsForMonth(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query('month', ParseIntPipe) month: number,
    @Query('year', ParseIntPipe) year: number,
  ) {
    return this.electricityService.getMeterReadingsForMonth(propertyId, month, year);
  }

  @Post('/submit-readings/:propertyId')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async submitAllReadings(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() dto: SubmitAllReadingsDto,
  ) {
    return this.electricityService.submitAllReadings(propertyId, dto);
  }
}
