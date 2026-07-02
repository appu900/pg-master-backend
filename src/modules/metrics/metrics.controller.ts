import { Controller, Get, Logger, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { GetUser } from 'src/common/decorators/Getuser.decorator';
import { StaffService } from '../staff/staff.service';

@Controller('metrics')
export class MetricsController {
  private readonly logger = new Logger(MetricsController.name);
  constructor(
    private readonly metricsService: MetricsService,
    private readonly staffService: StaffService,
  ) {}

  @Get(':propertyId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  async getPropertyMetrics(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @GetUser() user: any,
  ) {
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffFinanceModuleAccess(
        user.userId,
        propertyId,
        'viewDues',
      );
    }
    return this.metricsService.getPropertyMetrics(propertyId);
  }
}
