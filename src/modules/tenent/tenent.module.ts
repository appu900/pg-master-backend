import { Module } from '@nestjs/common';
import { TenentService } from './tenent.service';
import { TenentController } from './tenent.controller';

@Module({
  providers: [TenentService],
  controllers: [TenentController]
})
export class TenentModule {}
