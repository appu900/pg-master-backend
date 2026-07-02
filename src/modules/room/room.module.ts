import { Module } from '@nestjs/common';
import { StaffModule } from '../staff/staff.module';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';

@Module({
  imports: [StaffModule],
  controllers: [RoomController],
  providers: [RoomService],
})
export class RoomModule {}
