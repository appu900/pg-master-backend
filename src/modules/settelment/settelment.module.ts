import { Module } from '@nestjs/common';
import { SettlementController } from './settelment.controller';
import { SettleMentService } from './settelment.service';
import { SettlementCacheManager } from './cache/settlement.cachemanager';

@Module({
  controllers: [SettlementController],
  providers: [SettleMentService, SettlementCacheManager],
  exports: [SettleMentService],
})
export class SettelmentModule {}
