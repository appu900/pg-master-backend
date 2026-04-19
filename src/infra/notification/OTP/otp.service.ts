import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { IQueueProducer, QUEUE_PRODUCER } from 'src/core/ports/queue-producer.port';
import { RedisService } from 'src/infra/redis/redis.service';

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
    // Use cryptographically secure random number generation
    const otp = crypto.randomInt(100000, 999999).toString();

    await this.redisService.set(
      `otp:${phoneNumber}`,
      otp,
      this.OTP_EXPIRY_SECONDS,
    );

    const payload = {
      to: '+91'+phoneNumber,
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
      phone:'+91'+phoneNumber,
      channels: ['whatsapp'],
      data: { otp },
    },{
       jobId: `otp-${phoneNumber}-${Date.now()}`,
      priority: 1, 
      attempts: 2, 
    })
    console.log("no blocking here bro")
    
    this.logger.log(`OTP sent to ${phoneNumber.slice(-4).padStart(10, '*')}`);

    return {
      message: 'otp sent',
      expiredIn: this.OTP_EXPIRY_SECONDS,
    };
  }

  async verifyOtp(phoneNumber: string, providedOtp: string): Promise<void> {
    const storedOtp = await this.redisService.get(`otp:${phoneNumber}`);

    if (!storedOtp) {
      this.logger.warn(
        `OTP verification failed: expired for ${phoneNumber.slice(-4).padStart(10, '*')}`,
      );
      throw new BadRequestException(
        'OTP has expired. Please request a new one',
      );
    }

    if (storedOtp !== providedOtp) {
      this.logger.warn(
        `OTP verification failed: invalid for ${phoneNumber.slice(-4).padStart(10, '*')}`,
      );
      throw new BadRequestException('Invalid OTP. Please check and try again');
    }

    await this.redisService.del(`otp:${phoneNumber}`);
    this.logger.log(
      `OTP verified successfully for ${phoneNumber.slice(-4).padStart(10, '*')}`,
    );
  }
}
