import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PropertyController } from './property.controller';
import { PropertyService } from './property.service';
import { PropertyEvents } from './property.event';
import { PropertyEventPublisher } from './events/services/property.events';
import { PropertyCacheManager } from './cache/services/property.cache';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, 
      },
    }),
  ],
  controllers: [PropertyController],
  providers: [PropertyService,PropertyEvents,PropertyEventPublisher,PropertyCacheManager]
})
export class PropertyModule {}
