import { OnModuleDestroy, Injectable, Logger } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name)
  private readonly client: Redis;

  constructor() {
    const options: RedisOptions = {
      maxRetriesPerRequest: 2,

      enableReadyCheck: true,

      retryStrategy: (attempt) => {
        const delay = Math.min(attempt * 100, 300);
        console.warn(`Redis retry ${attempt}, delay ${delay}ms`);
        return delay;
      },

      ...(process.env.REDIS_TLS === 'true' ? { tls: {} } : {}),

      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
    };

    if (process.env.REDIS_URL) {
      const url = process.env.REDIS_URL.replace(/^redis:\/\//, 'rediss://');
      this.client = new Redis(url, options);
      console.log("redis client",this.client)
      this.logger.debug("REDIS CLIENT - ",this.client)
      
    } else {
      this.client = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT) || 6379,
        db: Number(process.env.REDIS_DB) || 0,
        ...options,
      });
    }

    this.setupEventHandlers();
    this.warmUp();
  }

  private setupEventHandlers() {
    this.client.on('connect', () => console.log('Redis: connected'));
    this.client.on('ready', () => console.log('Redis: ready'));
    this.client.on('reconnecting', () =>
      console.warn('Redis: reconnecting...'),
    );
    this.client.on('end', () => console.log('Redis: closed'));
    this.client.on('error', (err) => console.error('Redis: error:', err));
  }

  private async warmUp() {
    try {
      await this.client.ping();
    } catch (err) {
      console.error('Redis warmup failed', err);
    }
  }

  getClient(): Redis {
    return this.client;
  }

  async xadd(stream: string, values: Record<string, string>) {
    const args = Object.entries(values).flat();
    return this.client.xadd(stream, '*', ...args);
  }

  async set(key: string, value: string, ttlSeconds: number) {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async get(key: string) {
    const value = await this.client.get(key);
    return value;
  }

  async del(key: string) {
    return this.client.del(key);
  }

  async eval(lua: string, keys: string[], args: (string | number)[]) {
    return this.client.eval(lua, keys.length, ...keys, ...args);
  }

  async getConnection() {
    return {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
    };
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
