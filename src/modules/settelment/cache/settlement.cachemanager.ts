import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from 'src/infra/redis/redis.service';

@Injectable()
export class SettlementCacheManager {
  private readonly logger = new Logger(SettlementCacheManager.name);

  constructor(private readonly redis: RedisService) {}

  private getKey(propertyId: number): string {
    return `settlement:propertyId:${propertyId}`;
  }

  async getCachedData<T>(propertyId: number): Promise<T | null> {
    const key = this.getKey(propertyId);
    const cached = await this.redis.getClient().get(key);
    if (!cached) return null;
    return JSON.parse(cached) as T;
  }

  async setCache<T>(propertyId: number, data: T): Promise<void> {
    const key = this.getKey(propertyId);
    await this.redis.getClient().set(key, JSON.stringify(data));
  }

  async invalidateAndSet<T>(propertyId: number, data: T): Promise<void> {
    const key = this.getKey(propertyId);
    const client = this.redis.getClient();
    await client.del(key);
    await client.set(key, JSON.stringify(data));
  }

  async deleteCachedData(propertyId: number): Promise<void> {
    const key = this.getKey(propertyId);
    await this.redis.getClient().del(key);
  }
}
