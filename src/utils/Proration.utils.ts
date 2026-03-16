import { Decimal } from '@prisma/client/runtime/library';

/**
 * Calculate prorated rent amount for an irregular first period.
 *
 * Example:
 *   joinDate      = March 13
 *   billingCycleDay = 15
 *   monthlyRent   = 30,000
 *
 *   periodStart = March 13
 *   periodEnd   = April 15
 *   totalDays   = 34  (Mar: 19 days, Apr: 15 days)
 *   dailyRate   = 30000 / 31 = 967.74  (March has 31 days → use join month)
 *   marDays     = 19  (Mar 13..31)
 *   aprDays     = 15  (Apr 1..15)
 *   proratedAmt = (967.74 * 19) + (30000/30 * 15)  ← per-month daily rate
 *
 * We calculate daily rate per calendar month to be fair.
 */
export function calculateProratedRent(
  joinDate: Date,
  billingCycleDay: number,
  monthlyRent: number,
): {
  periodStart: Date;
  periodEnd: Date;
  proratedAmount: number;
} {
  const periodStart = toDateOnly(joinDate);

  // periodEnd = billingCycleDay of the NEXT month from joinDate
  // e.g. joinDate=Mar 13, cycleDay=15 → periodEnd=Apr 15
  const periodEnd = getFirstCycleEnd(joinDate, billingCycleDay);

  // Walk through each calendar month in the range and accumulate
  let totalAmount = 0;
  let cursor = new Date(periodStart);

  while (cursor < periodEnd) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth(); // 0-based
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dailyRate = monthlyRent / daysInMonth;

    // Last day of this calendar month
    const monthEnd = new Date(year, month + 1, 0);
    const segmentEnd = periodEnd < monthEnd ? periodEnd : monthEnd;

    // Days from cursor to segmentEnd inclusive
    const days = Math.round(
      (segmentEnd.getTime() - cursor.getTime()) / 86400000,
    ) + 1;

    totalAmount += dailyRate * days;

    // Move cursor to first day of next month
    cursor = new Date(year, month + 1, 1);
  }

  return {
    periodStart,
    periodEnd,
    proratedAmount: Math.round(totalAmount * 100) / 100, // round to 2dp
  };
}

/**
 * Returns the end date of the first billing cycle.
 * joinDate = Mar 13, cycleDay = 15 → Apr 15
 * joinDate = Mar 16, cycleDay = 15 → Apr 15 (already past this month's cycle)
 * joinDate = Mar 15, cycleDay = 15 → Apr 15 (joined ON cycle day)
 */
export function getFirstCycleEnd(joinDate: Date, cycleDay: number): Date {
  const joinDay = joinDate.getDate();
  const joinMonth = joinDate.getMonth();
  const joinYear = joinDate.getFullYear();

  // If joining before or on cycleDay → next month's cycleDay
  // If joining after cycleDay → month after next's cycleDay
  let targetMonth = joinMonth + 1;
  let targetYear = joinYear;

  if (joinDay > cycleDay) {
    targetMonth = joinMonth + 2;
  }

  if (targetMonth > 11) {
    targetMonth = targetMonth - 12;
    targetYear += 1;
  }

  return new Date(targetYear, targetMonth, cycleDay);
}

/**
 * Returns the next billing date after a given cycle end.
 * e.g. cycleEnd = Apr 15, cycleDay = 15 → May 15
 */
export function getNextBillingDate(cycleEnd: Date, cycleDay: number): Date {
  const year = cycleEnd.getFullYear();
  const month = cycleEnd.getMonth();

  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 11) {
    nextMonth = 0;
    nextYear += 1;
  }

  return new Date(nextYear, nextMonth, cycleDay);
}

export function toDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}