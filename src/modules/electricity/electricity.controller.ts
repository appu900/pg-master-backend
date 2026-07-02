import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from 'src/common/decorators/Getuser.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SubmitAllReadingsDto } from './dto/submit-all-readings.dto';
import { ElectricityService } from './electricity.service';
import { StaffService } from '../staff/staff.service';

@Controller('electricity')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ElectricityController {
  constructor(
    private readonly electricityService: ElectricityService,
    private readonly staffService: StaffService,
  ) {}

  private async resolveOwnerContext(user: any, propertyId: number): Promise<number> {
    let effectiveOwnerId = user.userId;
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffFinanceModuleAccess(
        user.userId,
        propertyId,
        'editDues',
      );
      effectiveOwnerId = await this.staffService.resolveOwnerFromStaff(user.userId);
    }
    return effectiveOwnerId;
  }

  @Get('/rooms/:propertyId')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  async getRoomsWithMeter(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @GetUser() user: { userId: number; role: string },
  ) {
    const ownerId = await this.resolveOwnerContext(user, propertyId);
    return this.electricityService.getRoomsWithMeter(propertyId, ownerId);
  }

  @Get('/meter-readings/:propertyId')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  async getMeterReadingsForMonth(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query('month', ParseIntPipe) month: number,
    @Query('year', ParseIntPipe) year: number,
    @GetUser() user: { userId: number; role: string },
  ) {
    const ownerId = await this.resolveOwnerContext(user, propertyId);
    return this.electricityService.getMeterReadingsForMonth(
      propertyId,
      ownerId,
      month,
      year,
    );
  }

  @Get('/status/:propertyId')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  async getMeterReadingStatus(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query('month', ParseIntPipe) month: number,
    @Query('year', ParseIntPipe) year: number,
    @GetUser() user: { userId: number; role: string },
  ) {
    const ownerId = await this.resolveOwnerContext(user, propertyId);
    return this.electricityService.getMeterReadingStatus(
      propertyId,
      ownerId,
      month,
      year,
    );
  }

  @Post('/submit-readings/:propertyId')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  async submitAllReadings(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() dto: SubmitAllReadingsDto,
    @GetUser() user: { userId: number; role: string },
  ) {
    const ownerId = await this.resolveOwnerContext(user, propertyId);
    return this.electricityService.submitAllReadings(propertyId, ownerId, dto);
  }
}
