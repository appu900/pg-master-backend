import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { RedisService } from 'src/infra/redis/redis.service';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly OTP_EXPIRY_SECONDS = 300;
  
  constructor(private redisService: RedisService) {}

  async sendOtp(phoneNumber: string): Promise<{ message: string; expiredIn: number }> {
    // Use cryptographically secure random number generation
    const otp = crypto.randomInt(100000, 999999).toString();
    
    await this.redisService.set(`otp:${phoneNumber}`, otp, this.OTP_EXPIRY_SECONDS);
    
    await this.redisService.xadd('notification_stream', {
      type: 'otp',
      phone: phoneNumber,
      otp,
    });
    
    this.logger.log(`OTP sent to ${phoneNumber.slice(-4).padStart(10, '*')}`);
    
    return {
      message: 'otp sent',
      expiredIn: this.OTP_EXPIRY_SECONDS,
    };
  }

  async verifyOtp(phoneNumber: string, providedOtp: string): Promise<void> {
    const storedOtp = await this.redisService.get(`otp:${phoneNumber}`);
    
    if (!storedOtp) {
      this.logger.warn(`OTP verification failed: expired for ${phoneNumber.slice(-4).padStart(10, '*')}`);
      throw new BadRequestException('OTP has expired. Please request a new one');
    }
    
    if (storedOtp !== providedOtp) {
      this.logger.warn(`OTP verification failed: invalid for ${phoneNumber.slice(-4).padStart(10, '*')}`);
      throw new BadRequestException('Invalid OTP. Please check and try again');
    }
    
    await this.redisService.del(`otp:${phoneNumber}`);
    this.logger.log(`OTP verified successfully for ${phoneNumber.slice(-4).padStart(10, '*')}`);
  }
  
}
