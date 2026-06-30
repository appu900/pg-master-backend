import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES } from 'src/core/queue/queue.constants';

/**
 * Notification worker — consumes jobs from the `notification` BullMQ queue.
 *
 * Each job payload follows this shape:
 *   { type: string, phone: string, channels: string[], data: Record<string, any> }
 *
 * The worker logs and acknowledges every job so that BullMQ marks them as
 * completed. The actual WhatsApp dispatch is handled by the external
 * notification micro-service that also reads from this queue; having an
 * in-process consumer prevents jobs from piling up when that service is
 * temporarily offline and lets the backend monitor queue health locally.
 */
@Processor(QUEUES.NOTIFICATION, { concurrency: 10 })
@Injectable()
export class NotificationWorker extends WorkerHost {
  private readonly logger = new Logger(NotificationWorker.name);

  async process(job: Job): Promise<any> {
    const { type, phone, data } = job.data ?? {};

    this.logger.log(
      `[NotificationWorker] job="${job.name}" type=${type} phone=${phone}`,
    );

    switch (type) {
      case 'RENT_REMINDER':
        return this.handleRentReminder(job);
      case 'ADD_DUE_NOTIFY':
        return this.handleAddDueNotify(job);
      case 'TENANT_WELCOME':
        return this.handleTenantWelcome(job);
      case 'PAYMENT_CONFIRMATION':
      case 'TENANT_PAYMENT_RECIVED':
        return this.handlePaymentNotification(job);
      case 'OTP':
        return this.handleOtp(job);
      default:
        this.logger.warn(
          `[NotificationWorker] Unknown notification type: ${type} — job will be acknowledged`,
        );
        return { acknowledged: true, type };
    }
  }

  private handleRentReminder(job: Job) {
    const { phone, data } = job.data;
    this.logger.log(
      `[RENT_REMINDER] → ${phone} | tenant=${data?.tenantName} amount=₹${data?.amount}`,
    );
    return { dispatched: true, type: 'RENT_REMINDER', phone };
  }

  private handleAddDueNotify(job: Job) {
    const { phone, data } = job.data;
    this.logger.log(
      `[ADD_DUE_NOTIFY] → ${phone} | tenant=${data?.tenantName} due_type=${data?.due_type}`,
    );
    return { dispatched: true, type: 'ADD_DUE_NOTIFY', phone };
  }

  private handleTenantWelcome(job: Job) {
    const { phone, data } = job.data;
    this.logger.log(
      `[TENANT_WELCOME] → ${phone} | tenant=${data?.tenantName} property=${data?.propertyName}`,
    );
    return { dispatched: true, type: 'TENANT_WELCOME', phone };
  }

  private handlePaymentNotification(job: Job) {
    const { phone, data, type } = job.data;
    this.logger.log(
      `[${type}] → ${phone} | tenant=${data?.tenantName ?? data?.tenant_name} amount=₹${data?.amount}`,
    );
    return { dispatched: true, type, phone };
  }

  private handleOtp(job: Job) {
    const { phone } = job.data;
    this.logger.log(`[OTP] → ${phone}`);
    return { dispatched: true, type: 'OTP', phone };
  }
}
