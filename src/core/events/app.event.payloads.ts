// src/core/events/event-payloads.ts

export type PropertyCreatedEventPayload = {
  propertyId: number;
  ownerId: number;
  month: number;
  year: number;
};

export type PropertyDeletedPayload = {
  propertyId: number;
  ownerId: number;
};

export type RoomCreatedEventPayload = {
  roomId: number;
  propertyId: number;
  ownerId: number;
  bedCount: number;
  month: number;
  year: number;
};

export type RoomDeletedPayload = {
  roomId: number;
  propertyId: number;
  ownerId: number;
};

export type TenantAddedPayload = {
  tenantId: number;
  propertyId: number;
  ownerId: number;
  rentAmount: number;
  securityDepositeAmount: number;
  billingCycleDay: number;
  dueDate: string;
};

export type DueCreatedPayload = {
  dueId: number;
  tenancyId: number;
  propertyId: number;
  dueType: string;
  totalAmount: number;
  month: number;
  year: number;
};

export type DuePaymentCollectedPayload = {
  dueId: number;
  propertyId: number;
  dueType: string;
  amountPaid: number;
  month: number;
  year: number;
};

export type PaymentAuthIntiateEventPayload = {
  phoneNumber: string;
  otp: string;
};

export type PaymentSucessEventPayload = {
  tenentName: string;
  tenantPhoneNumber: string;
  propertyName: string;
  amount: number;
};

export type PaymentFailedEventPayload = {
  tenantName: string;
  tenantPhoneNumber: string;
  propertyName: string;
  amount: number;
};

// The map ties event name → payload type
export type EventPayloadMap = {
  'property.created': PropertyCreatedEventPayload;
  'property.deleted': PropertyDeletedPayload;
  'room.created': RoomCreatedEventPayload;
  'tenant.added': TenantAddedPayload;
  'due.created': DueCreatedPayload;
  'due.payment.collected': DuePaymentCollectedPayload;
  'payment.intiate.event': PaymentAuthIntiateEventPayload;
  'payment.sucess.event': PaymentSucessEventPayload;
  'payment.failed.event': PaymentFailedEventPayload;
};

// Helper — use this everywhere instead of writing the type inline
export type PayloadOf<T extends keyof EventPayloadMap> = EventPayloadMap[T];
