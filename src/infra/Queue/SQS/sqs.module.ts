import { Global, Module } from '@nestjs/common';
import { SqsService } from './sqs.service';

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [SqsService],
  exports:[SqsService]
})
export class SqsModule {}
