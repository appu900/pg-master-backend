import { BadRequestException, Injectable } from '@nestjs/common';
import { RedisService } from 'src/infra/redis/redis.service';

@Injectable()
export class OtpService {
  private readonly SET_OTP_LUA: string;
  constructor(private redisService: RedisService) {}

  async sendOtp(phoneNumber: string) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiredIn = 300;
    await this.redisService.set(`otp:${phoneNumber}`, otp, expiredIn);
    const res = await this.redisService.xadd('notification_stream', {
      type:'otp',
      phone: phoneNumber,
      otp,
    });
    console.log('stream added', res);
    return {
      message: 'otp sent',
      expiredIn,
    };
  }

  async verifyOtp(phoneNumber: string, providedOtp: string) {
    const storedOtp = await this.redisService.get(`otp:${phoneNumber}`);
    console.log(storedOtp)
    if (!storedOtp) throw new BadRequestException('otp expired');
    if (storedOtp !== providedOtp) throw new BadRequestException('Invalid otp');
    await this.redisService.del(`otp:${phoneNumber}`); 
  }
  
}
