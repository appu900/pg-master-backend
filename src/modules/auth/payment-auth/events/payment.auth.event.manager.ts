import { Logger, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Appevents } from 'src/core/events/app.events';

@Injectable()
export class PaymentAuthEventPusblisher {
  private readonly logger = new Logger(PaymentAuthEventPusblisher.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async createPaymentAuthEvent(phoneNumber: string,otp:string) {
    this.logger.debug(
      `Creating payment auth event for phone number: ${phoneNumber}`,
    );
    this.eventEmitter.emit(Appevents.PAYMENT_AUTH_INTIATE_EVENT, {
      phoneNumber,otp
    });
  }
}
