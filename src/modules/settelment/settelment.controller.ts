import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SettleMentService } from './settelment.service';
import { HttpStatusCode } from 'axios';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { GetUser } from 'src/common/decorators/Getuser.decorator';
import { StaffService } from '../staff/staff.service';

@Controller('settlement')
export class SettlementController {
  private readonly logger = new Logger(SettlementController.name);
  constructor(
    private readonly settlementService: SettleMentService,
    private readonly staffService: StaffService,
  ) {}

  @Post('/process-webhook')
  @HttpCode(HttpStatusCode.Ok)
  async reciveWebhookPayload(@Body() body: any) {
    console.log('webhook payload recived', body);
    return await this.settlementService.setWebhookPayload(body);
  }

  @Get('/:propertyId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @HttpCode(HttpStatusCode.Accepted)
  async getSettlementData(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @GetUser() user: any,
  ) {
    if (!propertyId) throw new BadRequestException();
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffFinanceModuleAccess(
        user.userId,
        propertyId,
        'viewDues',
      );
    }
    return this.settlementService.getSettlementByPropertyID(propertyId);
  }
}
