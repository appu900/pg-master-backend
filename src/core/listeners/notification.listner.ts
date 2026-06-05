import { Logger, Injectable, Inject } from '@nestjs/common';
import { IQueueProducer, QUEUE_PRODUCER } from '../ports/queue-producer.port';
import {
  DueCreatedEvent,
  DuePaymentCollectedEvent,
  TenantAddedEvent,
} from '../events/domain-events';
import { OnEvent } from '@nestjs/event-emitter';
import { QUEUES } from '../queue/queue.constants';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { AppService } from 'src/app.service';
import { Appevents } from '../events/app.events';
import { PaymentAuthIntiateEventPayload, PaymentSucessEventPayload } from '../events/app.event.payloads';

@Injectable()
export class NotificationListner {
  private readonly logger = new Logger(NotificationListner.name);
  constructor(
    @Inject(QUEUE_PRODUCER) private readonly queue: IQueueProducer,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent('tenant.added')
  async onTenantAdded(event: TenantAddedEvent) {
    await this.queue.enqueue(
      QUEUES.NOTIFICATION,
      'tenant.added',
      {
        type: 'TENANT_WELCOME',
        phone: '+91' + event.tenantPhone,
        channels: ['whatsapp'],
        data: {
          tenantName: event.tenantName,
          propertyName: event.propertyName,
          appLink: 'https://app.rentpe.com',
          pg_name: event.propertyName,
        },
      },
      {
        jobId: `notification-tenant-added-${event.tenantId}`,
      },
    );
    console.log(
      `enqued to send welcome notification to tenant with id ${event.tenantId}`,
    );
  }

  @OnEvent('due.created')
  async onDueCreated(event: DueCreatedEvent) {
    const result = await this.prisma.tenancy.findFirst({
      where: {
        id: event.tenancyId,
        tenancyStatus: 'ACTIVE',
        deletedAt: null,
        propertyId: event.propertyId,
      },
      select: {
        property: {
          select: {
            name: true,
          },
        },
        tenent: {
          select: {
            fullName: true,
            phoneNumber: true,
          },
        },
      },
    });
    if (!result) {
      this.logger.error(`tenant not found for tenancy id ${event.tenancyId}`);
      return;
    }
    const propertyName = result.property.name;
    const tenantName = result.tenent.fullName;
    const tenantPhoneNumber = result.tenent.phoneNumber;
    await this.queue.enqueue(QUEUES.NOTIFICATION, 'due.created', {
      type: 'ADD_DUE_NOTIFY',
      phone: '+91' + tenantPhoneNumber,
      channels: ['whatsapp'],
      data: {
        tenantName: tenantName,
        due_type: event.dueType,
        due_amount: event.totalAmount,
        due_date: 'With in this month end',
        payment_link: 'https://rentpay.com/pay?12345',
      },
    });
    this.logger.debug(
      `ENQUEUED THE NOTFICATON FOR DUE WITH TENANT NAME ${tenantName}`,
    );
  }

  @OnEvent('due.payment.collected')
  async onPaymentCollected(event: DuePaymentCollectedEvent) {
    const date = new Date();
    const fullDate =
      date.getDate() + '-' + (date.getMonth() + 1) + '-' + date.getFullYear();
    await this.queue.enqueue(QUEUES.NOTIFICATION, 'due.payment.collected', {
      type: 'PAYMENT_CONFIRMATION',
      phone: '+91' + event.tenantPhone,
      channels: ['whatsapp'],
      data: {
        tenantName: event.tenantName,
        amount: event.amountPaid,
        paidAt: `${fullDate}`,
        balanceAmount: event.balanceAmount,
      },
    });
  }



  @OnEvent(Appevents.PAYMENT_SUCESS_EVENT)
  async onPaymentSuccess(eventPayload:PaymentSucessEventPayload){
    console.log('recived payment success event in notification listner',eventPayload)
    await this.queue.enqueue(QUEUES.NOTIFICATION,Appevents.PAYMENT_SUCESS_EVENT,{
      type:'PAYMENT_SUCCESS',
      phone:'+91'+eventPayload.tenantPhoneNumber,
      channels:['whatsapp'],
      data:{
        tenant_name:eventPayload.tenentName,
        due_name:'due',
        amount: eventPayload.amount,
        propertyName: eventPayload.propertyName,
      }
    })
    this.logger.debug(`enqueued payment success notification for tenant ${eventPayload.tenentName} for property ${eventPayload.propertyName} for amount ${eventPayload.amount}`)
  }

  @OnEvent(Appevents.PAYMENT_AUTH_INTIATE_EVENT)
  async onPaymentAuthVerify(eventPayload:PaymentAuthIntiateEventPayload){
    const phoneNumber = eventPayload.phoneNumber;
    const verificationOtp = eventPayload.otp
    console.log("verification otp in listner",verificationOtp)
    await this.queue.enqueue(QUEUES.NOTIFICATION,'payment.auth.initiate',{
      type:'OTP',
      phone:'+91'+phoneNumber,
      channels:['whatsapp'],
      data:{
        otp:verificationOtp,
      }
    })
  }
}
