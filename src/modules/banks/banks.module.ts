import { Module } from '@nestjs/common';
import { StaffModule } from '../staff/staff.module';
import { BanksController } from './banks.controller';
import { BanksService } from './banks.service';

@Module({
  imports: [StaffModule],
  controllers: [BanksController],
  providers: [BanksService],
})
export class BanksModule {}
