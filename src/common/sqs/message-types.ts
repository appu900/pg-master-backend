export const SQS_MESSAGE_TYPES = {
  GENERATE_FIRST_INVOICE: 'GENERATE_FIRST_INVOICE',
  GENERATE_INVOICE: 'GENERATE_INVOICE',
  PROCESS_PAYMENT: 'PROCESS_PAYMENT',
  APPLY_LATE_FEE: 'APPLY_LATE_FEE',
  ATTACH_CHARGES: 'ATTACH_CHARGES',
  SCHEDULE_REMINDERS: 'SCHEDULE_REMINDERS',
  SEND_REMINDER: 'SEND_REMINDER',
  SEND_WHATSAPP: 'SEND_WHATSAPP',
  PAYMENT_CONFIRMATION: 'PAYMENT_CONFIRMATION',
  CHARGE_NOTIFICATION: 'CHARGE_NOTIFICATION',
  CRON_DAILY_BILLING: 'CRON_DAILY_BILLING',
  CRON_REMINDER_SCAN: 'CRON_REMINDER_SCAN',
  CREATE_TENANCY:'CREATE_TENANCY',
  SEND_NOTIFICATION:'SEND_NOTIFICATION'
} as const;

export type SQSMessageType =
  (typeof SQS_MESSAGE_TYPES)[keyof typeof SQS_MESSAGE_TYPES];

export interface SQSMessageEnvelope {
  messageType: SQSMessageType;
  messageId: string;
  timestamp: string;
  retryCount: number;
  payload: any;
}


export interface ProduceSQSMessage{
    messageType:SQSMessageType,
    payload:any
}

export interface GenerateFirstInvoicePayload {
  tenancyId: number;
  propertyId: number;
  joinedAt: string; // ISO date
}

export interface GenerateInvoicePayload {
  tenancyId: number;
  propertyId: number;
  periodStart: string;
  periodEnd: string;
  invoiceType: string;
}

export interface ProcessPaymentPayload {
  paymentId: number;
  invoiceId: number;
  tenancyId: number;
  amount: number;
  paymentMethod: string;
  gatewayData?: Record<string, string>;
}

export interface ApplyLateFeePayload {
  invoiceId: number;
  tenancyId: number;
  propertyId: number;
  dueDate: string;
  daysLate: number;
}

export interface AttachChargesPayload {
  tenancyId: number;
  chargeId: number;
}

export interface ScheduleRemindersPayload {
  invoiceId: number;
  tenancyId: number;
  dueDate: string;
}

export interface SendReminderPayload {
  reminderScheduleId: number;
  tenancyId: number;
  invoiceId?: number;
  reminderType: string;
  channel: string;
  recipientPhone: string;
  recipientName: string;
  templateName: string;
  templateData: Record<string, string>;
}

export interface SendWhatsAppPayload {
  to: string;
  templateName: string;
  templateData: Record<string, string>;
  reminderLogId?: number;
}

export interface PaymentConfirmationPayload {
  paymentId: number;
  invoiceId: number;
  tenancyId: number;
  amount: number;
  phone: string;
  tenantName: string;
}

export interface ChargeNotificationPayload {
  chargeId: number;
  tenancyId: number;
  chargeType: string;
  amount: number;
  title: string;
  phone: string;
  tenantName: string;
}

export interface CronDailyBillingPayload {
  date: string;
}

export interface CronReminderScanPayload {
  date: string;
}
