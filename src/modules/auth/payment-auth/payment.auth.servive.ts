import {
  Injectable,
  Logger,
  Body,
  Post,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { PayUserVerificationDto } from './payment.auth.dto';
import { UserRole } from '@prisma/client';
import { AuthService } from '../auth.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentAuthEventPusblisher } from './events/payment.auth.event.manager';
import { PaymentAuthCacheManager } from './cache/payment.chaheManager';

@Injectable()
export class PaymentAuthService {
  private readonly logger = new Logger(PaymentAuthService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly eventEmitter:EventEmitter2,
    private readonly paymentAuthEventPublisher:PaymentAuthEventPusblisher,
    private readonly paymentAuthCacheService:PaymentAuthCacheManager
  ) {}

  async findUser(phoneNumber: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        phoneNumber: phoneNumber,
        role: UserRole.TENANT,
        isActive: true,
      },
    });

    if (!user) {
      throw new BadRequestException(
        'We can not find any active tenant with this phone number',
      );
    }
    const existingOtp = await this.paymentAuthCacheService.getOtp(phoneNumber)
    if (existingOtp){
      await this.paymentAuthCacheService.invalidateOtp(phoneNumber);
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("generated otp",otp)
    await this.paymentAuthCacheService.setOtp(phoneNumber, otp);
    await this.paymentAuthEventPublisher.createPaymentAuthEvent(phoneNumber,otp);
    return {
      message: 'OTP has been sent to your registered phone number',
    };
  }
}
