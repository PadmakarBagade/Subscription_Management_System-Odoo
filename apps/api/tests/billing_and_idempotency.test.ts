import { describe, it, expect, beforeAll } from 'vitest';
import { BillingEngine } from '../src/services/billingEngine';
import { prisma } from '../src/utils/prisma';

describe('Recurring Billing Engine & Idempotency Suite', () => {
  let testSubscription: any;

  beforeAll(async () => {
    // Look up seeded customer 1
    const customer = await prisma.customerProfile.findFirst({
      where: { user: { email: 'john.doe@example.com' } },
    });
    const plan = await prisma.plan.findUnique({
      where: { code: 'PLAN_STARTER' },
    });
    const product = await prisma.product.findUnique({
      where: { code: 'PROD_ERP' },
    });

    // Create a subscription due for billing right now (nextBillingDate in past)
    const subNumber = `SUB-TEST-BILL-${Date.now()}`;
    const pastBillingDate = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago

    testSubscription = await prisma.subscription.create({
      data: {
        subscriptionNumber: subNumber,
        customerId: customer!.id,
        planId: plan!.id,
        status: 'ACTIVE',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        nextBillingDate: pastBillingDate,
        billingFrequency: 'MONTHLY',
        subtotal: 2000.0,
        taxAmount: 360.0,
        totalAmount: 2360.0,
        lines: {
          create: [
            {
              productId: product!.id,
              quantity: 1,
              unitPrice: 2000.0,
              subtotal: 2000.0,
              totalAmount: 2000.0,
            },
          ],
        },
      },
    });
  });

  it('First Run: should process eligible subscription and generate an invoice', async () => {
    const result = await BillingEngine.executeBillingRun('TEST_RUN_1');
    expect(result.status).toBe('COMPLETED');
    expect(result.invoicesCreated).toBeGreaterThan(0);

    // Verify invoice was created for our test subscription
    const invoice = await prisma.invoice.findFirst({
      where: { subscriptionId: testSubscription.id },
    });
    expect(invoice).not.toBeNull();
    expect(invoice?.status).toBe('CONFIRMED');
    expect(Number(invoice?.totalAmount)).toBeGreaterThan(0);

    // Verify nextBillingDate was advanced
    const updatedSub = await prisma.subscription.findUnique({
      where: { id: testSubscription.id },
    });
    expect(updatedSub?.nextBillingDate).toBeDefined();
    expect(new Date(updatedSub!.nextBillingDate!).getTime()).toBeGreaterThan(
      new Date(testSubscription.nextBillingDate!).getTime()
    );
  });

  it('Second Run: IDEMPOTENCY GUARANTEE - should NOT generate duplicate invoice for the same period', async () => {
    // Count existing invoices for this subscription
    const countBefore = await prisma.invoice.count({
      where: { subscriptionId: testSubscription.id },
    });

    // Trigger billing run again immediately
    const result2 = await BillingEngine.executeBillingRun('TEST_RUN_2');
    expect(result2.status).toBe('COMPLETED');

    const countAfter = await prisma.invoice.count({
      where: { subscriptionId: testSubscription.id },
    });

    // Proves that repeated execution did not duplicate invoices
    expect(countAfter).toBe(countBefore);
  });
});
