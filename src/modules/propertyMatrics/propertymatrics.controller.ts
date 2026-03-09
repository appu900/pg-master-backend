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

@Controller('property-matrics')
export class PropertyMatricsController {
  constructor(
    private readonly propertymatricsService: PropertyMatricsService,
  ) {}

  @Get('/:propertyId')
  // @UseGuards(JwtAuthGuard,RolesGuard)
  // @Roles(Role.PROPERTY_OWNER)
  async fetchPropertyMonthlyMatrics(
    @Param('propertyId', ParseIntPipe) propertyId: number,
  ) {
    const result =
      await this.propertymatricsService.fetchPropertyMatrics(propertyId);
    return {
      success: true,
      message: 'property finance data fetched sucessfully',
      result,
    };
  }
}
