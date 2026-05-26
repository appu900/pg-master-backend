import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { GetUser } from 'src/common/decorators/Getuser.decorator';
import { PaymentService } from './payment.service';
import { InitiatePaymentDto, MakePaymentDto } from './dto/initiate-payment.dto';
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


  @Post('make')
  @Roles(Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async makePayment(@Body() dto:MakePaymentDto, @GetUser() user: any) {
    return this.paymentService.makePayment(dto, user.userId);
  }

  @Post('webhook')
  @HttpCode(200)
  async webhook(@Body() payload: EasebuzzWebhookPayload) {
    const res = await this.paymentService.handleWebhook(payload);
    if (res.received === true && res.status === "success") {
      return 
    }
    
  }

  @Get('status/:txnId')
  @Roles(Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getStatus(@Param('txnId') txnId: string, @GetUser() user: any) {
    return this.paymentService.getTransactionStatus(txnId, user.userId);
  }

  @Get('history/:tenantId')
  @Roles(Role.TENANT, Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getPaymentHistory(@Param('tenantId', ParseIntPipe) tenantId: number) {
    return this.paymentService.getTenantPaymentHistory(tenantId);
  }
}
