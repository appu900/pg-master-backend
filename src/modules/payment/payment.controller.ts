import {
  Body,
  Controller,
  Get,
  HttpCode,
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

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('initiate')
  @Roles(Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async initiatePayment(@Body() dto: InitiatePaymentDto, @GetUser() user: any) {
    return this.paymentService.initiatePayment(dto.dueId, user.userId);
  }

  @Post('webhook')
  @HttpCode(200)
  async webhook(@Body() payload: EasebuzzWebhookPayload) {
    return this.paymentService.handleWebhook(payload);
  }

  @Get('status/:txnId')
  @Roles(Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getStatus(@Param('txnId') txnId: string, @GetUser() user: any) {
    return this.paymentService.getTransactionStatus(txnId, user.userId);
  }

  @Get('history')
  @Roles(Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getPaymentHistory(@GetUser() user: any) {
    return this.paymentService.getTenantPaymentHistory(user.userId);
  }
}
