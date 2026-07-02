import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { EasebuzzModule } from 'src/infra/payment/easebuzz/easebuzz.module';
import { PaymentConfigModule } from '../payment-config/payment-config.module';
import { PaymentHelperService } from './helper/payment.helper.service';
import { PaymentCacheService } from './cache/payment.cache.service';
import { PaymentEventPublisher } from './events/payments.eventpublisher';
import { StaffModule } from '../staff/staff.module';
import { StaffService } from '../staff/staff.service';




@Module({
  imports: [EventEmitterModule, EasebuzzModule, PaymentConfigModule, StaffModule],
  controllers: [PaymentController],
  providers: [PaymentService,PaymentHelperService,PaymentEventPublisher,PaymentCacheService],
})
export class PaymentModule {}
