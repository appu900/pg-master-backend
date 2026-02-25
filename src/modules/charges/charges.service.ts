import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { SqsService } from 'src/infra/Queue/SQS/sqs.service';
import { AddChargeDto } from './dto/add-charge.dto';
import { ChargeType, TenancyStatus, TenantStatus } from '@prisma/client';
import { ElectricityChargeDto } from './dto/add-electricity-charges';
import { SQS_EVENT_TYPES } from 'src/common/sqs/message-types';
import { describe } from 'node:test';

@Injectable()
export class ChargesService {
  private readonly logger = new Logger(ChargesService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly sqsService: SqsService,
  ) {}

  async addCharge(ownerId: number, propertyId: number, dto: AddChargeDto) {
    const tenancy = await this.prisma.tenancy.findFirst({
      where: {
        tenentId: dto.tenantId,
        propertyId: propertyId,
        tenancyStatus: TenancyStatus.ACTIVE,
      },
      select: {
        id: true,
        propertyId: true,
        status: true,
        tenentId: true,
        tenancyStatus: true,
        property: {
          select: {
            id: true,
            ownerId: true,
          },
        },
      },
    });
    if (!tenancy) {
      throw new NotFoundException('Tenancy not found for this tenant');
    }
    if (tenancy.property.ownerId !== ownerId) {
      throw new NotFoundException(
        "You don't have permission to add charge for this tenant",
      );
    }
    if (tenancy.tenancyStatus !== TenancyStatus.ACTIVE) {
      throw new NotFoundException('Tenancy is not active');
    }
    let finalAmount = dto.amount;
  }

  async addElectricityBill(ownerId: number, dto: ElectricityChargeDto) {
    const transaction_result = await this.prisma.$transaction(async (tx) => {
      const room = await tx.room.findFirst({
        where: { id: dto.roomId, propertyId: dto.propertyId },
        select: {
          id: true,
          lastMeterReading: true,
          meterReadingDate: true,
        },
      });
      if (!room) {
        throw new NotFoundException('Room not found');
      }
      const unitConsumed = dto.currentMeterReading - room.lastMeterReading;
      const ratePerUnit = dto.perUnitCost;
      const amount = parseFloat((unitConsumed * ratePerUnit).toFixed(2));
      const activeTenancies = await tx.tenancy.findMany({
        where: {
          roomId: dto.roomId,
          propertyId: dto.propertyId,
          status: TenancyStatus.ACTIVE,
          deletedAt: null,
        },
        select: {
          id: true,
          tenent: { select: { id: true, phoneNumber: true, fullName: true } },
        },
      });
      if (activeTenancies.length === 0) {
        throw new NotFoundException('No active tenancies found for this room');
      }
      const totaltenants = activeTenancies.length;
      const amountPerTenant = parseFloat((amount / totaltenants).toFixed(2));
      const title = `Electricity Bill - ${new Date().toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      })}`;

      const description = `Electricity bill for the period ${dto.startDate.toDateString()} to ${dto.endDate.toDateString()}. Total units consumed: ${unitConsumed} at a rate of ${ratePerUnit} per unit. Total amount: ${amount}. Amount per tenant: ${amountPerTenant}`;

      const charges = await Promise.all(
        activeTenancies.map((tenancy) =>
          tx.tenantCharge.create({
            data: {
              tenancyId: tenancy.id,
              propertyId: dto.propertyId,
              amount: amountPerTenant,
              title: title,
              status: 'PENDING',
              description: description,
              chargeType: ChargeType.ELECTRICITY,
              previousReading: room.lastMeterReading,
              currentReading: dto.currentMeterReading,
              ratePerUnit: ratePerUnit,
              startDate: dto.startDate,
              endDate: dto.endDate,
              addedById: ownerId,
              attachments: [],
            },
            select: {
              id: true,
              tenancyId: true,
              amount: true,
            },
          }),
        ),
      );
      await tx.room.update({
        where: { id: dto.roomId },
        data: {
          lastMeterReading: dto.currentMeterReading,
          meterReadingDate: new Date(),
        },
      });
      return {
        charges,
        activeTenancies,
        amountPerTenant,
        title,
        totalAmount: amount,
        unitConsumed,
      };
    });
    await Promise.allSettled(
      transaction_result.charges.map(async (charge) => {
        const tenancy = transaction_result.activeTenancies.find(
          (t) => t.id === charge.tenancyId,
        );

        // send sqs event to generate invoice
        await this.sqsService.sendEvent({
          messageType: SQS_EVENT_TYPES.ATTACH_CHARGES,
          payload: {
            tenancyId: charge.tenancyId,
            chargeId: charge.id,
            invoiceId: 0,
          },
        });

        // notify tenant via whatsapp
        if (tenancy) {
          await this.sqsService.sendEvent({
            messageType: SQS_EVENT_TYPES.SEND_WHATSAPP,
            payload: {
              tenancyId: tenancy.id,
              chargeId: charge.id,
              tenantId: tenancy.tenent.id,
              tenantPhoneNumber: tenancy.tenent.phoneNumber,
              tenantName: tenancy.tenent.fullName,
              amount: charge.amount,
              title: transaction_result.title,
            },
          });
        }
      }),
    );
    return {
      sucess: true,
    };
  }
}
