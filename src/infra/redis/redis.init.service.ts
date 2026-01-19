import { Injectable, OnModuleInit } from '@nestjs/common';
import { RedisService } from './redis.service';

@Injectable()
export class RedisInitService implements OnModuleInit {
  constructor(private redisService: RedisService) {}
  async onModuleInit() {
    const redis = this.redisService.getClient();
    try {
      await redis.call(
        'XGROUP',
        'CREATE',
        'notification_stream',
        'notification_group',
        '$',
        'MKSTREAM',
      );
      console.log('OTP stream group created');
    } catch (err) {
      if (err?.message?.includes('BUSYGROUP')) {
        console.log('OTP stream group already exists');
        return;
      }
      // Re-throw unexpected errors
      console.error('Failed to create OTP stream group:', err);
      throw err;
    }
  }
}
