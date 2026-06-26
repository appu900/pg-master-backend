import { toDateOnly } from 'src/utils/Proration.utils';

export interface TenantElectricityAllocation {
  tenancyId: number;
  propertyId: number;
  tenantId: number;
  roomId: number;
  roomNumber: string;
  amount: number;
  units: number;
  source: 'METERED_ROOM' | 'SHARED_POOL';
}

/**
 * Inclusive tenant-days occupied within a billing month.
 */
export function getTenantDaysInMonth(
  joinedAt: Date,
  leftAt: Date | null,
  month: number,
  year: number,
): number {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0));

  const occupancyStart = toDateOnly(joinedAt);
  const start = occupancyStart > monthStart ? occupancyStart : monthStart;

  const occupancyEnd = leftAt ? toDateOnly(leftAt) : monthEnd;
  const end = occupancyEnd < monthEnd ? occupancyEnd : monthEnd;

  if (start > end) return 0;

  return (
    Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
  );
}

export function getBillingPeriodDates(month: number, year: number) {
  const periodStart = new Date(Date.UTC(year, month - 1, 1));
  const periodEnd = new Date(Date.UTC(year, month, 0));
  const dueDate = new Date(Date.UTC(year, month, 0));
  return { periodStart, periodEnd, dueDate };
}

export function splitAmountEqually(totalAmount: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(totalAmount / count);
  const remainder = totalAmount - base * count;
  return Array.from({ length: count }, (_, index) =>
    index < remainder ? base + 1 : base,
  );
}
