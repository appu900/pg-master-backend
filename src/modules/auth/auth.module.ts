import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { OtpModule } from 'src/infra/notification/OTP/otp.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PaymentAuthService } from './payment-auth/payment.auth.servive';
import { PaymentAuthController } from './payment-auth/payment.auth.controller';
import { PaymentAuthEventPusblisher } from './payment-auth/events/payment.auth.event.manager';
import { PaymentAuthCacheManager } from './payment-auth/cache/payment.chaheManager';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '5d' },
      }),
    }),
    UserModule,
    OtpModule,
  ],
  controllers: [AuthController,PaymentAuthController],
  providers: [AuthService, JwtStrategy,PaymentAuthService,PaymentAuthEventPusblisher,PaymentAuthCacheManager],
})
export class AuthModule {}
