import { BillingService } from './billing.service';
import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AddDueDto } from './dto/add-due.dto';
import { EditDueDto } from './dto/edit-due.dto';
import { GetUser } from 'src/common/decorators/Getuser.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from 'src/common/enum/role.enum';
import { Roles } from 'src/common/decorators/roles.decorator';
import { StaffService } from '../staff/staff.service';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly staffService: StaffService,
  ) {}

  @Post('create-due')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  async addDue(@Body() dto: AddDueDto, @GetUser() user: any) {
    let ownerUserId = user.userId;
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffFinanceModuleAccess(
        user.userId,
        dto.propertyId,
        'editDues',
      );
      ownerUserId = await this.staffService.resolveOwnerFromStaff(user.userId);
    }
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

  @Delete('delete-due/:dueId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  async deleteDue(@Param('dueId', ParseIntPipe) dueId: number, @GetUser() user: any) {
    let ownerUserId = user.userId;
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffDueDeleteAccess(user.userId, dueId);
      ownerUserId = await this.staffService.resolveOwnerFromStaff(user.userId);
    }
    return this.billingService.deleteDue(dueId, ownerUserId);
  }

  @Patch('edit-due/:dueId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  async editDue(
    @Param('dueId', ParseIntPipe) dueId: number,
    @Body() dto: EditDueDto,
    @GetUser() user: any,
  ) {
    let ownerUserId = user.userId;
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffDueFinanceAccess(
        user.userId,
        dueId,
        'editDues',
      );
      ownerUserId = await this.staffService.resolveOwnerFromStaff(user.userId);
    }
    return this.billingService.editDue(dueId, dto, ownerUserId);
  }
}
