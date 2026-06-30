import { Logger,Injectable, Post, Controller, Body, HttpStatus, HttpCode } from "@nestjs/common";
import { PaymentAuthService } from "./payment.auth.servive";
import { PayUserVerificationDto } from "./payment.auth.dto";

@Controller('payment-auth')
export class PaymentAuthController {
    private readonly logger = new Logger(PaymentAuthController.name)
    constructor(private readonly paymentAuthService:PaymentAuthService) {}

    @HttpCode(HttpStatus.OK)
    @Post('/send-otp')
    async makePaymentAuthVerfication(@Body() dto: PayUserVerificationDto){
        this.logger.debug(`Received payment auth verification request for phone number: ${dto.phoneNumber}`);
        return this.paymentAuthService.findUser(dto.phoneNumber)
    }
}