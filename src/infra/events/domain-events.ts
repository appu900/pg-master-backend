export const DOMAIN_EVENTS = {
  INVOICE_GENERATE: 'invoice.generate',
  DUE_CREATE: 'due.create',
  METRICS_UPDATE: 'metrics.update',

  PAYMENT_RECORD: 'payment.record',

  TENANCY_ACTIVATED: 'tenancy.activated',
  TENANCY_EXITED: 'tenancy.exited',

  NOTIFY_WHATSAPP: 'notify.whatsapp',
  NOTIFY_EMAIL: 'notify.email',
  NOTIFY_PUSH: 'notify.push',

  RENT_DUE_CREATE: 'rent.due.create',
  PAYMENT_COLLECTED: 'payment.collected',
  DAILY_REMINDER_ENQUEUE: 'reminder.daily.enqueue',
  DAILY_REMINDER_DEQUEUE: 'reminder.daily.dequeue',

  CACHE_INVALIDATE: 'cache.invalidate',
} as const;

export type DomainEventType =
  (typeof DOMAIN_EVENTS)[keyof typeof DOMAIN_EVENTS];

export interface DomainEvent<T = unknown> {
  type: DomainEventType;
  payload: T;
  occurredAt: Date;
  correlationId?: string;
}

export interface InvoiceGeneratePayload {
  tenancyId: number;
  propertyId: number;
  month: number;
  year: number;
}

export interface DueCreatePayload {
  tenancyId: number;
  propertyId: number;
  dueType: string;
  title: string;
  totalAmount: number;
  month: number;
  year: number;
  dueDate: string;
}

export interface MetricsUpdatePayload {
  propertyId: number;
  month: number;
  year: number;
}

export interface PaymentRecordPayload {
  dueId: number;
  tenancyId: number;
  propertyId: number;
  amount: number;
  paymentMode: string;
  recordedById: number;
  paidAt: string;
  month: number;
  year: number;
  upiApp?: string;
  transactionId?: string;
  notes?: string;
}

export interface TenancyActivatedPayload {
  tenancyId: number;
  propertyId: number;
  tenantId: number;
}

export interface TenancyExitedPayload {
  tenancyId: number;
  propertyId: number;
  tenantId: number;
  leftAt: string;
}

export interface NotifyWhatsappPayload {
  reminderId: number;
  to: string;
  templateKey: string;
  templateData: Record<string, string>;
  externalId?: string;
}

export interface NotifyEmailPayload {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export interface NotifyPushPayload {
  userId: number;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface CacheInvalidatePayload {
  entity: 'property' | 'tenancy' | 'due' | 'user';
  entityId: number;
}

export interface DomainEventPayloadMap {
  [DOMAIN_EVENTS.INVOICE_GENERATE]: InvoiceGeneratePayload;
  [DOMAIN_EVENTS.DUE_CREATE]: DueCreatePayload;
  [DOMAIN_EVENTS.METRICS_UPDATE]: MetricsUpdatePayload;
  [DOMAIN_EVENTS.PAYMENT_RECORD]: PaymentRecordPayload;
  [DOMAIN_EVENTS.TENANCY_ACTIVATED]: TenancyActivatedPayload;
  [DOMAIN_EVENTS.TENANCY_EXITED]: TenancyExitedPayload;
  [DOMAIN_EVENTS.NOTIFY_WHATSAPP]: NotifyWhatsappPayload;
  [DOMAIN_EVENTS.NOTIFY_EMAIL]: NotifyEmailPayload;
  [DOMAIN_EVENTS.NOTIFY_PUSH]: NotifyPushPayload;
  [DOMAIN_EVENTS.CACHE_INVALIDATE]: CacheInvalidatePayload;
}

// export function createEvent<T extends DomainEventType>(
//   type: T,
//   payload: DomainEventPayloadMap[T],
//   correlationId?: string,
// ): DomainEvent<DomainEventPayloadMap[T]> {
//   return { type, payload, occurredAt: new Date(), correlationId };
// }
