import { Logger, NotFoundException, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AgrregationResult,
  PaymentResultPayload,
} from '../event-types/payment.event.types';
import { AnyCatcher } from 'rxjs/internal/AnyCatcher';
import { AnyCaaRecord, AnyCnameRecord } from 'node:dns';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { PaymentSucessEventPayload } from 'src/core/events/app.event.payloads';
import { Appevents } from 'src/core/events/app.events';

@Injectable()
export class PaymentEventPublisher {
  private readonly logger = new Logger(PaymentEventPublisher.name);
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
  ) {}

  private async fetchTenantAndPropertyDetails(
    propertyId: number,
    tenancyId : number,
  ) {
    try {
      const [tenantDetails, propertyDetails] = await Promise.all([
        this.prisma.tenancy.findUnique({
            where:{id: tenancyId},
             select:{
               tenent: {
                 select: {
                   fullName: true,
                   phoneNumber:true
                 }
               }
             }
        }),
        this.prisma.property.findUnique({
          where: { id: propertyId },
          select: { name: true, ownerId: true },
        }),
      ]);
      if (!tenantDetails)
        throw new NotFoundException(`tenant with id ${tenancyId} not found`);
      if (!propertyDetails)
        throw new NotFoundException(`property with if ${propertyId} not found`);
      const aggregateResult: AgrregationResult = {
        tenantName: tenantDetails.tenent.fullName,
        tenatPhoneNumber: tenantDetails.tenent.phoneNumber,
        propertyName: propertyDetails.name,
      };
      return aggregateResult;
    } catch (error) {
      this.logger.error(
        `Failed to fetch tenant or property details for tenantId: ${tenancyId}, propertyId: ${propertyId}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  async onPaymentSuccess(payload: PaymentResultPayload) {
    this.logger.debug(
      `Publishing payment succkess event for txnId: ${payload.transactionId}`,
    );
    try {
      const aggregateResult = await this.fetchTenantAndPropertyDetails(
        payload.propertyId,
        payload.tenantId,
      );
      const paymentsucessEventPayload: PaymentSucessEventPayload = {
        tenentName: aggregateResult.tenantName,
        tenantPhoneNumber: aggregateResult.tenatPhoneNumber,
        propertyName: aggregateResult.propertyName,
        amount: Number(payload.amount),
      };
      this.eventEmitter.emit(
        Appevents.PAYMENT_SUCESS_EVENT,
        paymentsucessEventPayload,
      );
      this.logger.debug(
        `Emitted payment.success event for txnId: ${payload.transactionId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to publish payment success event for txnId: ${payload.transactionId}`,
        error.stack,
      );
    }
  }

  async onPaymentFailed(payload: PaymentResultPayload) {
    this.logger.debug(
      `Publishing payment failed event for txnId: ${payload.transactionId}`,
    );
    try {
      const aggregateResult = await this.fetchTenantAndPropertyDetails(
        payload.propertyId,
        payload.tenantId,
      );
      const paymentFailedEventPayload: PaymentSucessEventPayload = {
        tenentName: aggregateResult.tenantName,
        tenantPhoneNumber: aggregateResult.tenatPhoneNumber,
        propertyName: aggregateResult.propertyName,
        amount: Number(payload.amount),
      };
      this.eventEmitter.emit(
        Appevents.PAYMENT_FAILED_EVENT,
        paymentFailedEventPayload,
      );
      this.logger.debug(
        `Emitted payment.failed event for txnId: ${payload.transactionId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to publish payment failed event for txnId: ${payload.transactionId}`,
        error.stack,
      );
    }
  }
}
