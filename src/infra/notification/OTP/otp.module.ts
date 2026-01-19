import { Module } from '@nestjs/common';
import { OtpService } from './otp.service';

@Module({
  imports: [],
  controllers: [],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
