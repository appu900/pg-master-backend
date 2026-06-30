import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { IQueueProducer, QUEUE_PRODUCER } from 'src/core/ports/queue-producer.port';
import { RedisService } from 'src/infra/redis/redis.service';
import { normalizePhoneNumber } from 'src/utils/phone.utils';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly OTP_EXPIRY_SECONDS = 300;

  constructor(
    private redisService: RedisService,
    @Inject(QUEUE_PRODUCER) private readonly queue:IQueueProducer
  ) {}

  async sendOtp(
    phoneNumber: string,
  ): Promise<{ message: string; expiredIn: number }> {
    const phone = normalizePhoneNumber(phoneNumber);
    // Use cryptographically secure random number generation
    const otp = crypto.randomInt(100000, 999999).toString();
    await this.redisService.set(
      `otp:${phone}`,
      otp,
      this.OTP_EXPIRY_SECONDS,
    );
    
    const payload = {
      to: '+91'+phone,
      templateKey: 'OTP',
      templateData: {
        otp: otp,
      },
      isReminder: false,
      externalId: '',
    };


    console.log("blocking starts here")
    await this.queue.enqueue('notification','send',{
      type:'OTP',
      phone:'+91'+phone,
      channels: ['whatsapp'],
      data: { otp },
    },{
       jobId: `otp-${phone}-${Date.now()}`,
      priority: 1, 
      attempts: 2, 
    })
    console.log("no blocking here bro")
    
    this.logger.log(`OTP sent to ${phone.slice(-4).padStart(10, '*')}`);

    return {
      message: 'otp sent',
      expiredIn: this.OTP_EXPIRY_SECONDS,
    };
  }

  async verifyOtp(phoneNumber: string, providedOtp: string): Promise<void> {
    const phone = normalizePhoneNumber(phoneNumber);
    const storedOtp = await this.redisService.get(`otp:${phone}`);

    if (!storedOtp) {
      this.logger.warn(
        `OTP verification failed: expired for ${phone.slice(-4).padStart(10, '*')}`,
      );
      throw new BadRequestException(
        'OTP has expired. Please request a new one',
      );
    }

    if (storedOtp !== providedOtp) {
      this.logger.warn(
        `OTP verification failed: invalid for ${phone.slice(-4).padStart(10, '*')}`,
      );
      throw new BadRequestException('Invalid OTP. Please check and try again');
    }

    await this.redisService.del(`otp:${phone}`);
    this.logger.log(
      `OTP verified successfully for ${phone.slice(-4).padStart(10, '*')}`,
    );
  }
}
