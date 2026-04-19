export interface RentDueCreatePayload {
  tenancyId: number;
  propertyId: number;
  tenantId: number;
  rentAmount: number;
  billingCycleDay: number;
  month: number;
  year: number;
}

export interface PaymentCollectedPayload {
  dueId: number;
  tenancyId: number;
  propertyId: number;
  tenantId: number;
  tenantPhone: string;
  tenantName: string;
  amount: number;
  balanceAmount: number;
  paymentMode: string;
  recordedById: number;
  paidAt: string;
  month: number;
  year: number;
  upiApp?: string;
  transactionId?: string;
  notes?: string;
}

export interface DailyReminderEnqueuePayload {
  dueId: number;
  tenancyId: number;
  propertyId: number;
  tenantPhone: string;
  tenantName: string;
  dueAmount: number;
  dueDate: Date;
  dueType: string;
  title: string;
}

export interface DailyReminderDequeuePayload {
  dueId: number;
}
