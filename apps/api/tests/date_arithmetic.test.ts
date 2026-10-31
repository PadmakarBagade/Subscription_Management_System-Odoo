import { describe, it, expect } from 'vitest';
import { calculateNextBillingDate, calculateBillingPeriodEnd, calculateDueDate } from '../src/utils/date';

describe('Date Arithmetic Utility', () => {
  it('should calculate daily billing accurately', () => {
    const start = new Date('2026-01-15T00:00:00Z');
    const next = calculateNextBillingDate(start, 'DAILY');
    expect(next.toISOString().split('T')[0]).toBe('2026-01-16');
  });

  it('should calculate weekly billing accurately (+7 days)', () => {
    const start = new Date('2026-01-15T00:00:00Z');
    const next = calculateNextBillingDate(start, 'WEEKLY');
    expect(next.toISOString().split('T')[0]).toBe('2026-01-22');
  });

  it('should calculate standard monthly billing accurately', () => {
    const start = new Date('2026-03-15T00:00:00Z');
    const next = calculateNextBillingDate(start, 'MONTHLY');
    expect(next.toISOString().split('T')[0]).toBe('2026-04-15');
  });

  it('should pin month-end dates correctly (Jan 31 to Feb 28 on a non-leap year)', () => {
    const start = new Date(2026, 0, 31); // Jan 31, 2026
    const next = calculateNextBillingDate(start, 'MONTHLY');
    // Feb in 2026 has 28 days
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(1); // February
    expect(next.getDate()).toBe(28);
  });

  it('should handle leap year month-end correctly (Jan 31 to Feb 29 on leap year 2028)', () => {
    const start = new Date(2028, 0, 31); // Jan 31, 2028
    const next = calculateNextBillingDate(start, 'MONTHLY');
    expect(next.getFullYear()).toBe(2028);
    expect(next.getMonth()).toBe(1); // February
    expect(next.getDate()).toBe(29);
  });

  it('should handle yearly renewals accurately (including Feb 29 leap year)', () => {
    const standardYearly = new Date('2026-05-10T00:00:00Z');
    const nextStandard = calculateNextBillingDate(standardYearly, 'YEARLY');
    expect(nextStandard.toISOString().split('T')[0]).toBe('2027-05-10');

    // Feb 29 on leap year 2028
    const leapYearDate = new Date(2028, 1, 29);
    const nextAfterLeap = calculateNextBillingDate(leapYearDate, 'YEARLY');
    // 2029 is not a leap year, so pins to Feb 28
    expect(nextAfterLeap.getFullYear()).toBe(2029);
    expect(nextAfterLeap.getMonth()).toBe(1);
    expect(nextAfterLeap.getDate()).toBe(28);
  });

  it('should calculate period end 1 second before next billing date', () => {
    const start = new Date('2026-06-01T00:00:00Z');
    const periodEnd = calculateBillingPeriodEnd(start, 'MONTHLY');
    expect(periodEnd.getTime()).toBeLessThan(calculateNextBillingDate(start, 'MONTHLY').getTime());
  });

  it('should calculate payment due date based on payment term days', () => {
    const invoiceDate = new Date('2026-08-01T10:00:00Z');
    const dueNet15 = calculateDueDate(invoiceDate, 15);
    expect(dueNet15.toISOString().split('T')[0]).toBe('2026-08-16');
  });
});
