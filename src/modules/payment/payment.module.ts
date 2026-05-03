import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { EasebuzzModule } from 'src/infra/payment/easebuzz/easebuzz.module';
import { PaymentConfigModule } from '../payment-config/payment-config.module';

@Module({
  imports: [EventEmitterModule, EasebuzzModule, PaymentConfigModule],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
