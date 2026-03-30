import { Injectable } from '@nestjs/common';
import { DueType } from '@prisma/client';
import { WhatsappNotificationPayload } from 'src/common/payload/Notification.payload';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { DOMAIN_EVENTS } from 'src/infra/events/domain-events';
import { EventPublisher } from 'src/infra/events/publisher/event-publisher';

@Injectable()
export class BillingEventHandler {
  constructor(
    private readonly eventPublisher: EventPublisher,
    private readonly prisma: PrismaService,
  ) {}

  async publishRentDueEvent(
    tenancyId: number,
    propertyId: number,
    tenanatName: string,
    dueDate: Date,
    amount: number,
    dueType: string,
    tenantPhoneNumber: string,
    dueId: number,
  ) {
    //  need to do fanout here
    // 1. publish an event to update the metrics for the property owner
    // 2. publish an event to notify the tenant about the due

    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!property) {
      return;
    }

    const whatsappPayload = {
      to: '+917735041901',
      templateKey: 'ADD_DUE_NOTIFY',
      templateData: {
        tenantName: tenanatName,
        due_type: dueType,
        due_amount: amount,
        due_date: new Date(dueDate).toLocaleString('default', {
          month: 'long',
          year: 'numeric',
        }),
        payment_link:
          'https://play.google.com/store/apps/details?id=com.pocketpg.app',
      },
      isReminder: false,
      externalId: undefined,
    };

    const addReminderPayload = {
      dueId: dueId,
      tenancyId: tenancyId,
      propertyId: propertyId,
      tenantPhone: tenantPhoneNumber,
      tenantName: tenanatName,
      dueType: dueType as DueType,
      dueDate: dueDate,
      amount: amount,
      title: `${dueType} for ${new Date(dueDate).toLocaleString('default', { month: 'long', year: 'numeric' })}`,
    };
    await this.eventPublisher.publishAll([
      { name: DOMAIN_EVENTS.NOTIFY_WHATSAPP, payload: whatsappPayload },
      {
        name: DOMAIN_EVENTS.DAILY_REMINDER_ENQUEUE,
        payload: addReminderPayload,
      },
    ]);
  }
}
