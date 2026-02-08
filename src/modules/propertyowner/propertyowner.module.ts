import { Module } from '@nestjs/common';
import { PropertyownerController } from './propertyowner.controller';
import { PropertyownerService } from './propertyowner.service';

@Module({
  controllers: [PropertyownerController],
  providers: [PropertyownerService]
})
export class PropertyownerModule {}
