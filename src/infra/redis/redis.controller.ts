import { Logger, Controller, Get } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

@Controller('/redis')
export class RedisController {
  private readonly logger = new Logger(RedisController.name);
  constructor(private readonly redisService: RedisService) {}

  @Get('/flush')
  async deleteAllKeys() {
    await this.redisService.flushAll();
    return {
      message: 'All keys deleted successfully',
    };
  }
}
