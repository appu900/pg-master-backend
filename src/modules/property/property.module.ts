import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PropertyController } from './property.controller';
import { PropertyService } from './property.service';

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
  providers: [PropertyService]
})
export class PropertyModule {}
