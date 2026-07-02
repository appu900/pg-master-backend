import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from 'src/common/decorators/Getuser.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { StaffService } from '../staff/staff.service';
import { UpsertLateFineDto } from './dto/upsert-late-fine.dto';
import { PropertySettingsService } from './property-settings.service';

@Controller('property-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PropertySettingsController {
  constructor(
    private readonly propertySettingsService: PropertySettingsService,
    private readonly staffService: StaffService,
  ) {}

  @Get('late-fine/:propertyId')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  async getLateFineConfig(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @GetUser() user: any,
  ) {
    let ownerUserId = user.userId;
    if (user.role === Role.MAINTENANCE_STAFF) {
      ownerUserId =
        await this.staffService.validateStaffOwnerSettingsPropertyAccess(
          user.userId,
          propertyId,
          'propertySettings',
        );
    }
    return this.propertySettingsService.getLateFineConfig(
      propertyId,
      ownerUserId,
    );
  }

  @Put('late-fine/:propertyId')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  async upsertLateFineConfig(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() dto: UpsertLateFineDto,
    @GetUser() user: any,
  ) {
    let ownerUserId = user.userId;
    if (user.role === Role.MAINTENANCE_STAFF) {
      ownerUserId =
        await this.staffService.validateStaffOwnerSettingsPropertyAccess(
          user.userId,
          propertyId,
          'propertySettings',
        );
    }
    return this.propertySettingsService.upsertLateFineConfig(
      propertyId,
      ownerUserId,
      dto,
    );
  }
}
