import {
  BadRequestException,
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { TenancyService } from './tenancy.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { GetUser } from 'src/common/decorators/Getuser.decorator';
import { EditTenancyDto } from './dto/update-tenancy.dto';
import { AddTenantDto } from './dto/add.tenant.dto';

@Controller('tenancy')
export class TenancyController {
  constructor(private readonly tenancyService: TenancyService) {}

  @Post('onboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER)
  async onBoardTenancy(@Body() dto: AddTenantDto, @GetUser() user: any) {
    const requestOwnerId = user.userId;
    const res = await this.tenancyService.createTenant(dto, requestOwnerId);
    return {
      message: 'Tenant create sucessfully',
      res,
    };
  }

  @Put('/tenant/:tenantId/property/:propertyId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER)
  async updateTenancyDetails(
    @Body() dto: EditTenancyDto,
    @GetUser() user: any,
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('propertyId', ParseIntPipe) propertyId: number,
  ) {
    if (!propertyId || !tenantId) {
      throw new BadRequestException('propertyId or tenantId required');
    }
    const owenrUserId = user.userId;
    const res = await this.tenancyService.updateTenancyDetails(
      tenantId,
      propertyId,
      dto,
    );
    return {
      res,
      message: 'update rental details sucessful',
    };
  }
}
