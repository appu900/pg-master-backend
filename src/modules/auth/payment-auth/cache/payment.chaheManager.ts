import { Logger, Injectable, Inject } from '@nestjs/common';
import { RedisService } from 'src/infra/redis/redis.service';

const keyPrefix = 'payment_auth:otp:';
@Injectable()
export class PaymentAuthCacheManager {
  private readonly logger = new Logger(PaymentAuthCacheManager.name);
  constructor(private readonly redis: RedisService) {}

  async setOtp(phoneNumber: string, otp: string) {
    this.logger.debug(`Setting OTP for phone number: ${phoneNumber}`);
    const key = `${keyPrefix}${phoneNumber}`;
    await this.redis.getClient().set(key, otp, 'EX', 300);
    return true;
  }

  async getOtp(phoneNumber: string): Promise<string | null> {
    this.logger.debug(`Getting OTP for phone number: ${phoneNumber}`);
    const key = `${keyPrefix}${phoneNumber}`;
    const otp = await this.redis.getClient().get(key);
    if (otp) {
      this.logger.debug(`OTP found for phone number: ${phoneNumber}`);
      return otp;
    }
    this.logger.debug(`No OTP found for phone number: ${phoneNumber}`);
    return null;
  }

  async invalidateOtp(phoneNumber: string) {
    this.logger.debug(`Invalidating OTP for phone number: ${phoneNumber}`);
    const key = `${keyPrefix}${phoneNumber}`;
    await this.redis.getClient().del(key);
    return true;
  }
}
