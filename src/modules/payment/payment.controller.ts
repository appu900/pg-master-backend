import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { GetUser } from 'src/common/decorators/Getuser.decorator';
import { PaymentService } from './payment.service';
import { InitiatePaymentDto, MakePaymentDto } from './dto/initiate-payment.dto';
import { EasebuzzWebhookPayload } from 'src/infra/payment/easebuzz/easebuzz.types';
import { StaffService } from '../staff/staff.service';

@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly staffService: StaffService,
  ) {}

  @Post('initiate')
  @Roles(Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async initiatePayment(@Body() dto: InitiatePaymentDto, @GetUser() user: any) {
    return this.paymentService.initiatePayment(dto, user.userId);
  }

  @Post('make')
  @Roles(Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async makePayment(@Body() dto: MakePaymentDto, @GetUser() user: any) {
    return this.paymentService.makePayment(dto, user.userId);
  }

  @Post('success')
  async success(
    @Body() payload: EasebuzzWebhookPayload,
    @Res() response: Response,
  ) {
    return this.redirectAfterGatewayCallback(payload, response);
  }

  @Post('failure')
  async failure(
    @Body() payload: EasebuzzWebhookPayload,
    @Res() response: Response,
  ) {
    return this.redirectAfterGatewayCallback(payload, response);
  }

  @Post('webhook')
  @HttpCode(200)
  async webhook(@Body() payload: EasebuzzWebhookPayload) {
    return this.paymentService.handleWebhook(payload);
  }

  private async redirectAfterGatewayCallback(
    payload: EasebuzzWebhookPayload,
    response: Response,
  ) {
    const result = await this.paymentService.handleWebhook(payload);
    const redirectUrl = this.paymentService.buildPaymentRedirectUrl(result);

    return response.redirect(303, redirectUrl);
  }

  @Get('status/:txnId')
  @Roles(Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getStatus(@Param('txnId') txnId: string, @GetUser() user: any) {
    return this.paymentService.getTransactionStatus(txnId, user.userId);
  }

  @Get('history/:tenantId')
  @Roles(Role.TENANT, Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getPaymentHistory(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @GetUser() user: any,
    @Query('tenancyId') tenancyId?: string,
    @Query('propertyId') propertyId?: string,
  ) {
    if (user.role === Role.MAINTENANCE_STAFF) {
      const parsedPropertyId = propertyId ? Number(propertyId) : NaN;
      if (!Number.isFinite(parsedPropertyId)) {
        throw new BadRequestException('propertyId is required for staff payment history');
      }
      await this.staffService.validateStaffRentBookAccess(
        user.userId,
        parsedPropertyId,
      );
    }
    return this.paymentService.getTenantPaymentHistory(
      tenantId,
      tenancyId ? Number(tenancyId) : undefined,
      propertyId ? Number(propertyId) : undefined,
    );
  }
}
