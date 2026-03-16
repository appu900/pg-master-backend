export interface AddTenantResult {
  tenantUserId: number;
  tenancyId: number;
  rentDueId: number;
  securityDepositDueId: number | null;
  proratedRentAmount: number;
  securityDepositAmount: number;
  rentPeriodStart: string;
  rentPeriodEnd: string;
  isNewUser: boolean;
}

export interface ActiveTenancyConflict {
  tenancyId: number;
  propertyName: string;
  roomNumber: string;
  joinedAt: string;
}
