import { Module } from '@nestjs/common';
import { PaymentConfigController } from './payment-config.controller';
import { PaymentConfigService } from './payment-config.service';

@Module({
  controllers: [PaymentConfigController],
  providers: [PaymentConfigService],
  exports: [PaymentConfigService],
})
export class PaymentConfigModule {}
