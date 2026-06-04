import { Logger, Injectable } from '@nestjs/common';
import { RedisService } from 'src/infra/redis/redis.service';

@Injectable()
export class PaymentCacheService {
  private readonly logger = new Logger(PaymentCacheService.name);
  constructor(private readonly cache: RedisService) {}

  async LockPayment(dueIds: number[]) {
    const key = this.getLockKey(dueIds);
    const result = await this.cache.set(key, 'locked', 840); // lock expires in 30 seconds
    this.logger.log(`Payment locked for Due IDs: ${dueIds.join(', ')}`);
  }

  async UnlockPayment(dueIds: number[]) {
    const key = this.getLockKey(dueIds);
    await this.cache.del(key);
    this.logger.log(`Payment unlocked for Due IDs: ${dueIds.join(', ')}`);
  }

  async IsPaymentLocked(dueIds: number[]): Promise<boolean> {
    const key = this.getLockKey(dueIds);
    const value = await this.cache.get(key);
    const isLocked = value === 'locked';
    this.logger.log(
      `Checked payment lock for Due IDs: ${dueIds.join(', ')} - Locked: ${isLocked}`,
    );
    return isLocked;
  }
  getLockKey(dueIds: number[]) {
    const sortedIds = dueIds.sort((a, b) => a - b);
    console.log('Sorted Due IDs for Lock Key:', sortedIds);
    return `payment:lock:${sortedIds.join(':')}`;
  }
}
