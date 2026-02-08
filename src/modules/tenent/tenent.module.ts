import { Module } from '@nestjs/common';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { RoomService } from '../room/room.service';
import { TenentController } from './tenent.controller';
import { TenentService } from './tenent.service';

@Module({
  imports: [],
  providers: [TenentService, RoomService, PrismaService],
  controllers: [TenentController],
  exports: [TenentService],
})
export class TenentModule {}
