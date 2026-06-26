import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from './redis.service';

@Injectable()
export class RedisInitService implements OnModuleInit {
  private readonly logger = new Logger(RedisInitService.name);

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
      this.logger.log('OTP stream group created');
    } catch (err) {
      if (err?.message?.includes('BUSYGROUP')) {
        this.logger.log('OTP stream group already exists');
        return;
      }

      if (this.isRedisUnavailable(err)) {
        this.logger.warn(
          'Redis unavailable — skipping OTP stream group init. Queue/OTP features will not work until Redis is reachable.',
        );
        return;
      }

      this.logger.error('Failed to create OTP stream group:', err);
      if (this.isRedisRequired()) {
        throw err;
      }
    }
  }

  private isRedisUnavailable(err: unknown): boolean {
    const message =
      err instanceof Error ? `${err.name} ${err.message}` : String(err);
    return (
      message.includes('MaxRetriesPerRequest') ||
      message.includes('max retries per request') ||
      message.includes('ENOTFOUND') ||
      message.includes('ECONNREFUSED') ||
      message.includes('ETIMEDOUT')
    );
  }

  private isRedisRequired(): boolean {
    if (process.env.REDIS_OPTIONAL === 'true') return false;
    if (process.env.REDIS_OPTIONAL === 'false') return true;
    return process.env.NODE_ENV === 'production';
  }
}
