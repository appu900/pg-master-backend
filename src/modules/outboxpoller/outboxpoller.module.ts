import { Module } from '@nestjs/common';
import { OutboxpollerService } from './outboxpoller.service';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from 'src/infra/Database/prisma/prisma.module';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  providers: [OutboxpollerService],
})
export class OutboxpollerModule {}
