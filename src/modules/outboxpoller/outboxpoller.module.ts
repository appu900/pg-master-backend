import { Module } from '@nestjs/common';
import { OutboxpollerService } from './outboxpoller.service';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from 'src/infra/Database/prisma/prisma.module';
import { SqsModule } from 'src/infra/Queue/SQS/sqs.module';

@Module({
  imports:[
    ScheduleModule.forRoot(),
    PrismaModule,
    SqsModule
  ],
  providers: [OutboxpollerService]
})
export class OutboxpollerModule {}
