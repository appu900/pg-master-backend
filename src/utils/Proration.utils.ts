// ─────────────────────────────────────────────────────────────────────────────
// PRORATION UTILS
//
// DATE MODEL:
//   periodStart  = joiningDate (inclusive, first day of tenancy)
//   periodEnd    = next cycle day (EXCLUSIVE — this is the day next cycle starts)
//   nextBilling  = month after periodEnd's cycle day
//
// Example: join Mar 19, cycleDay 5
//   periodStart = 2026-03-19  (inclusive)
//   periodEnd   = 2026-04-05  (exclusive — Apr 5 is when next month's rent is due)
//   Days billed = Mar 19,20,...31 (13 days) + Apr 1,2,3,4 (4 days) = 17 days
//   nextBilling = 2026-05-05
//
// All dates are UTC midnight to avoid IST (+5:30) shifting the calendar date.
// Never serialize raw Date objects in API responses — always use formatDate().
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse "YYYY-MM-DD" → UTC midnight Date. Always unambiguous.
 * Do NOT use new Date("2026-03-19T00:00:00") — that's LOCAL midnight
 * and will shift by -5:30 on IST servers.
 */
export function parseDateUTC(dateStr: string): Date {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid date string "${dateStr}". Expected YYYY-MM-DD`);
  }
  const [year, month, day] = parts;
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Strip time → UTC midnight of the same calendar date.
 */
export function toDateOnly(date: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  ));
}

/**
 * Format Date → "YYYY-MM-DD" using UTC fields.
 *
 * ALWAYS use this for API responses. Never return raw Date objects —
 * JSON.stringify(new Date("2026-03-19")) → "2026-03-18T18:30:00.000Z"
 * which shows the wrong date in IST.
 */
export function formatDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRORATED RENT
//
// periodEnd is EXCLUSIVE — it's the first day of the next billing cycle,
// not the last day of this one. Days billed = [periodStart, periodEnd).
//
// Example A — join Mar 19, cycleDay 5, rent ₹8000.50:
//   periodStart = Mar 19 (inclusive)
//   periodEnd   = Apr 5  (exclusive)
//   Mar 19..31  = 13 days  daily = 8000.50/31 = ₹258.08   → ₹3355.05
//   Apr 1..4    =  4 days  daily = 8000.50/30 = ₹266.68   → ₹1066.73
//   Total = ₹4421.78
//   nextBilling = May 5
//
// Example B — join Apr 5 ON cycleDay 5, rent ₹8000:
//   periodStart = Apr 5  (inclusive)
//   periodEnd   = May 5  (exclusive)
//   Apr 5..30   = 26 days  daily = 8000/30 = ₹266.67  → ₹6933.33
//   May 1..4    =  4 days  daily = 8000/31 = ₹258.06  → ₹1032.26
//   Total = ₹7965.59   (slightly under ₹8000 because Apr+May span two month lengths)
//   nextBilling = Jun 5
//   Note: this is mathematically correct — one full billing month at daily rates.
// ─────────────────────────────────────────────────────────────────────────────
export function calculateProratedRent(
  joinDate: Date,
  billingCycleDay: number,
  monthlyRent: number,
): {
  periodStart: Date;
  periodEnd: Date;   // EXCLUSIVE
  proratedAmount: number;
} {
  const periodStart = toDateOnly(joinDate);
  const periodEnd = getFirstCycleEnd(joinDate, billingCycleDay); // exclusive

  let totalAmount = 0;
  let cursor = new Date(periodStart);

  while (cursor < periodEnd) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth(); // 0-based

    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const dailyRate = monthlyRent / daysInMonth;

    // First day of next calendar month
    const firstOfNextMonth = new Date(Date.UTC(year, month + 1, 1));

    // Segment runs from cursor up to: earlier of periodEnd or firstOfNextMonth
    // Using < (exclusive) so we don't double-count the boundary day
    const segmentEnd = periodEnd < firstOfNextMonth ? periodEnd : firstOfNextMonth;

    // Days in segment (exclusive diff — no +1)
    // e.g. Mar 19 to Apr 1 = 13 days (19,20,...31)
    const days = Math.round(
      (segmentEnd.getTime() - cursor.getTime()) / 86_400_000,
    );

    totalAmount += dailyRate * days;
    cursor = firstOfNextMonth;
  }

  return {
    periodStart,
    periodEnd,
    proratedAmount: Math.round(totalAmount * 100) / 100,
  };
}

/**
 * First cycle end date (EXCLUSIVE) = cycleDay of next calendar month.
 *
 * Always next month — no "month+2 if joinDay > cycleDay" logic.
 * That logic was wrong. The cycleDay is just the day rent is collected.
 * If you join Mar 19 with cycleDay=5, first collection is Apr 5 (next month's 5th).
 *
 * Examples (cycleDay = 5):
 *   join Mar 1  → Apr 5   ✓
 *   join Mar 5  → Apr 5   ✓ (full month billed at daily rates)
 *   join Mar 19 → Apr 5   ✓ (NOT May 5)
 *   join Dec 19 → Jan 5   ✓ (year rollover)
 */
export function getFirstCycleEnd(joinDate: Date, billingCycleDay: number): Date {
  const joinYear = joinDate.getUTCFullYear();
  const joinMonth = joinDate.getUTCMonth(); // 0-based

  let targetMonth = joinMonth + 1;
  let targetYear = joinYear;

  if (targetMonth > 11) {
    targetMonth = 0;
    targetYear += 1;
  }

  return new Date(Date.UTC(targetYear, targetMonth, billingCycleDay));
}

/**
 * PREPAID SYSTEM — advance billing date by one cycle forward.
 *
 * Used ONLY by the cron after a monthly due is created, to move
 * nextBillingDate one month ahead:
 *   cron creates Apr 5 due  → nextBillingDate becomes May 5
 *   cron creates May 5 due  → nextBillingDate becomes Jun 5
 *
 * For ONBOARDING: nextBillingDate = periodEnd directly (no call needed here).
 *   join Mar 19, cycleDay 5 → periodEnd = Apr 5 → nextBillingDate = Apr 5
 */
export function advanceBillingDate(currentBillingDate: Date, cycleDay: number): Date {
  const year = currentBillingDate.getUTCFullYear();
  const month = currentBillingDate.getUTCMonth();

  let nextMonth = month + 1;
  let nextYear = year;

  if (nextMonth > 11) {
    nextMonth = 0;
    nextYear += 1;
  }

  return new Date(Date.UTC(nextYear, nextMonth, cycleDay));
}