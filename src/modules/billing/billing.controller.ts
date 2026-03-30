import { BillingService } from './billing.service';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AddDueDto } from './dto/add-due.dto';
import { GetUser } from 'src/common/decorators/Getuser.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from 'src/common/enum/role.enum';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('create-due')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER)
  async addDue(@Body() dto: AddDueDto, @GetUser() user: any) {
    const ownerUserId = user.userId;
    const res = await this.billingService.createDueForTenant(
      dto.tenantId,
      dto.propertyId,
      dto,
      ownerUserId,
    );
    return {
      message: 'Due created successfully',
      res,
    };
  }
}
