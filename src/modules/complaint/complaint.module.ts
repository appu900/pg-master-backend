import { Module } from '@nestjs/common';
import { ComplaintController } from './complaint.controller';
import { ComplaintService } from './complaint.service';

@Module({
  controllers: [ComplaintController],
  providers: [ComplaintService]
})
export class ComplaintModule {}
