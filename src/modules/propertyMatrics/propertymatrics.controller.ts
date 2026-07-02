import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PropertyMatricsService } from './propertymatrics.service';
import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { Role } from 'src/common/enum/role.enum';
import { GetUser } from 'src/common/decorators/Getuser.decorator';
import { StaffService } from '../staff/staff.service';

@Controller('property-matrics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PropertyMatricsController {
  constructor(
    private readonly propertymatricsService: PropertyMatricsService,
    private readonly staffService: StaffService,
  ) {}

  @Get('/:propertyId')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  async fetchPropertyMonthlyMatrics(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @GetUser() user: any,
  ) {
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffPropertyAccess(user.userId, propertyId);
    }
    const result =
      await this.propertymatricsService.fetchPropertyMatrics(propertyId);
    return {
      success: true,
      message: 'property finance data fetched sucessfully',
      result,
    };
  }
}
