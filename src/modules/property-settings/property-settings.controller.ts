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
import { UpsertLateFineDto } from './dto/upsert-late-fine.dto';
import { PropertySettingsService } from './property-settings.service';

@Controller('property-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PROPERTY_OWNER)
export class PropertySettingsController {
  constructor(
    private readonly propertySettingsService: PropertySettingsService,
  ) {}

  @Get('late-fine/:propertyId')
  async getLateFineConfig(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @GetUser() user: any,
  ) {
    return this.propertySettingsService.getLateFineConfig(
      propertyId,
      user.userId,
    );
  }

  @Put('late-fine/:propertyId')
  async upsertLateFineConfig(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() dto: UpsertLateFineDto,
    @GetUser() user: any,
  ) {
    return this.propertySettingsService.upsertLateFineConfig(
      propertyId,
      user.userId,
      dto,
    );
  }
}
