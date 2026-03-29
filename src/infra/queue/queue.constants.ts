export const QUEUES = {
  NOTIFICATION: 'notification',
  BILLING: 'billing',
  PAYMENT: 'payment',
  CACHE: 'cache',
  REMINDER: 'reminder',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

export const NOTIFICATION_JOBS = {
  SEND_WHATSAPP: 'notification.whatsapp',
  SEND_EMAIL: 'notification.email',
  SEND_SMS: 'notification.sms',
  SEND_PUSH: 'notification.push',
} as const;

export const BILLING_JOBS = {
  GENERATE_INVOICE: 'billing.generate_invoice',
  CREATE_DUE: 'billing.create_due',
  UPDATE_METRICS: 'billing.update_metrics',
} as const;

export const PAYMENT_JOBS = {
  RECORD_PAYMENT: 'payment.record',
} as const;

export const CACHE_JOBS = {
  INVALIDATE_PROPERTY: 'cache.property',
  INVALIDATE_TENANCY: 'cache.tenancy',
  INVALIDATE_DUE: 'cache.due',
  INVALIDATE_USER: 'cache.user',
} as const;

export const REMINDER_JOBS = {
  PROCESS_DUE: 'reminder.due',
  DAILY_SCAN: 'reminder.scan',
} as const;
