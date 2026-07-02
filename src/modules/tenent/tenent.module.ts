import { StaffModule } from '../staff/staff.module';
import { Module } from '@nestjs/common';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { RoomService } from '../room/room.service';
import { TenentController } from './tenent.controller';
import { TenentService } from './tenent.service';
import { TenantEventPublsiher } from './events/tenant.events';

@Module({
  imports: [StaffModule],
  providers: [TenentService, RoomService, PrismaService,TenantEventPublsiher],
  controllers: [TenentController],
  exports: [TenentService],
})
export class TenentModule {}
