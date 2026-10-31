import { BillingFrequency } from '@brightloop/shared';

/**
 * Calculates the next billing date given a start date and a billing frequency.
 * Handles month-end pinning, leap years, and calendar boundaries correctly.
 * For example, if subscription begins on Jan 31, monthly billing renews on:
 * - Feb 28 (or Feb 29 in a leap year)
 * - Mar 31
 * - Apr 30
 */
export function calculateNextBillingDate(startDate: Date, frequency: BillingFrequency): Date {
  const next = new Date(startDate.getTime());

  switch (frequency) {
    case 'DAILY': {
      next.setDate(next.getDate() + 1);
      return next;
    }

    case 'WEEKLY': {
      next.setDate(next.getDate() + 7);
      return next;
    }

    case 'MONTHLY': {
      const originalDay = startDate.getDate();
      const currentMonth = next.getMonth();
      // Move to next month
      next.setMonth(currentMonth + 1);

      // If the day changed due to overflow (e.g. Jan 31 -> Mar 3 because Feb has 28 days),
      // pin to the last day of the target month
      if (next.getDate() !== originalDay) {
        next.setDate(0); // Sets to the last day of the previous month
      }
      return next;
    }

    case 'YEARLY': {
      const originalDay = startDate.getDate();
      const originalMonth = startDate.getMonth();
      const currentYear = next.getFullYear();

      // Check if original date was Feb 29 on a leap year
      if (originalMonth === 1 && originalDay === 29) {
        const targetYear = currentYear + 1;
        const isTargetLeapYear =
          (targetYear % 4 === 0 && targetYear % 100 !== 0) || targetYear % 400 === 0;
        if (isTargetLeapYear) {
          next.setFullYear(targetYear, 1, 29);
        } else {
          next.setFullYear(targetYear, 1, 28);
        }
      } else {
        next.setFullYear(currentYear + 1);
      }
      return next;
    }

    default:
      throw new Error(`Unsupported billing frequency: ${frequency}`);
  }
}

/**
 * Calculates the end date of a billing cycle given the start date and frequency.
 * The period end is typically (next billing date - 1 second or midnight boundary).
 */
export function calculateBillingPeriodEnd(periodStart: Date, frequency: BillingFrequency): Date {
  const nextBilling = calculateNextBillingDate(periodStart, frequency);
  const end = new Date(nextBilling.getTime() - 1000); // 1 sec before next billing
  return end;
}

/**
 * Calculates due date based on invoice date and payment term days.
 */
export function calculateDueDate(invoiceDate: Date, paymentTermDays: number = 0): Date {
  const due = new Date(invoiceDate.getTime());
  due.setDate(due.getDate() + paymentTermDays);
  return due;
}
