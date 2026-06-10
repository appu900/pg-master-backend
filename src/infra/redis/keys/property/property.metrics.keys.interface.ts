
export const PropertyFinanceMetricFields = {
  totalDueGenerated: 'totalDueGenerated',
  totalElectricityDueGenerated: 'totalElectricityDueGenerated',
  totalDueCollected: 'totalDueCollected',
  totalPendingDue: 'totalPendingDue',
  totalSecurityDepositePending: 'totalSecurityDepositePending',
  totalTenantsPaid: 'totalTenantsPaid',
  totalTenantsNotPaid: 'totalTenantsNotPaid',
} as const;   

export const PropertyOtherMetricFields = {
  totalRooms: 'totalRooms',
  totalBeds: 'totalBeds',
  totalVacantBeds: 'totalVacantBeds',
  totalComplaints: 'totalComplaints',
  totalTenantsReadyToMoveIn: 'totalTenantsReadyToMoveIn',
  totalTenantsReadyToMoveout: 'totalTenantsReadyToMoveout',
  totalTenantsInNoticePeriod: 'totalTenantsInNoticePeriod',
  totalActiveTenants: 'totalActiveTenants',
} as const;

export type PropertyFinanceMetricField =
  (typeof PropertyFinanceMetricFields)[keyof typeof PropertyFinanceMetricFields];
export type PropertyOtherMetricField =
  (typeof PropertyOtherMetricFields)[keyof typeof PropertyOtherMetricFields];
