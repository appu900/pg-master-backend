import {
  Body,
  Controller,
  Get,
  HttpCode,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { GetUser } from 'src/common/decorators/Getuser.decorator';
import { PaymentService } from './payment.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { EasebuzzWebhookPayload } from 'src/infra/payment/easebuzz/easebuzz.types';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Tenant initiates an online payment for a due.
   * Returns paymentUrl — frontend redirects the user to this URL (EaseBuzz checkout).
   */
  @Post('initiate')
  @Roles(Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async initiatePayment(@Body() dto: InitiatePaymentDto, @GetUser() user: any) {
    return this.paymentService.initiatePayment(dto.dueId, user.userId);
  }

  /**
   * EaseBuzz posts here after success or failure (surl & furl point to this endpoint).
   * No auth guard — EaseBuzz calls this directly.
   * Always responds 200 so EaseBuzz doesn't retry.
   */
  @Get('webhook')
  @HttpCode(200)
  async webhook(@Body() payload: EasebuzzWebhookPayload) {
    return this.paymentService.handleWebhook(payload);
  }

  /**
   * Tenant checks the status of a previously initiated payment.
   */
  @Get('status/:txnId')
  @Roles(Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getStatus(@Param('txnId') txnId: string, @GetUser() user: any) {
    return this.paymentService.getTransactionStatus(txnId, user.userId);
  }
}
