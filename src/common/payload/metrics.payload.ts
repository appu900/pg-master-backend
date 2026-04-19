export interface MonthMetrics {
  dueRaised: number;
  collected: number;
  pending: number;
  tenantsWithDue: number;
  tenantsWithPendingDue: number;
  byType: Record<string, { raised: number; collected: number }>;
}

export interface PropertyMetrics {
  propertyId: number;
  ownerId: number;
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  activeTenants: number;
  thisMonth: MonthMetrics;
  lastMonth: MonthMetrics;
  updatedAt: string;
}

export interface PortfolioMonthMetrics {
  totalDueRaised: number;
  totalCollected: number;
  totalPending: number;
  tenantsWithDue: number;
  tenantsWithPendingDue: number;
}

export interface PortfolioMetrics {
  ownerId: number;
  totalProperties: number;
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  activeTenants: number;
  thisMonth: PortfolioMonthMetrics;
  lastMonth: PortfolioMonthMetrics;
  updatedAt: string;
}

export interface TenancyDueEntry {
  dueId: number;
  type: string;
  title: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
  dueDate: string;
}

export interface TenancyMetrics {
  tenancyId: number;
  tenantName: string;
  propertyId: number;
  activeDues: TenancyDueEntry[];
  totalPending: number;
  updatedAt: string;
}

export interface TenantAddedPayload {
  tenancyId: number;
  propertyId: number;
  ownerId: number;
}

export interface TenantExitedPayload {
  tenancyId: number;
  propertyId: number;
  ownerId: number;
}

export interface DueCreatedPayload {
  dueId: number;
  tenancyId: number;
  propertyId: number;
  ownerId: number;
  dueType: string;
  totalAmount: number;
  month: number;
  year: number;
}

export interface PaymentRecordedPayload {
  paymentId?: number;
  dueId: number;
  tenancyId: number;
  propertyId: number;
  ownerId: number;
  amount: number;
  dueType: string;
  month: number;
  year: number;
}

export type MetricsJobPayload =
  | ({ type: 'TENANT_ADDED' } & TenantAddedPayload)
  | ({ type: 'TENANT_EXITED' } & TenantExitedPayload)
  | ({ type: 'DUE_CREATED' } & DueCreatedPayload)
  | ({ type: 'PAYMENT_RECORDED' } & PaymentRecordedPayload);
