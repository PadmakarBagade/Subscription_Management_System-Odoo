import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { calculateNextBillingDate, calculateBillingPeriodEnd, calculateDueDate } from '../utils/date';
import { PricingService } from './pricingService';
import { DiscountService } from './discountService';
import { TaxService } from './taxService';
import { EmailService } from './emailService';
import { config } from '../config';

export interface BillingRunResult {
  runId: string;
  runNumber: string;
  status: 'COMPLETED' | 'FAILED' | 'PARTIAL';
  subscriptionsProcessed: number;
  invoicesCreated: number;
  subscriptionsSkipped: number;
  failureCount: number;
  errorSummary?: string;
}

export class BillingEngine {
  /**
   * Processes all active subscriptions currently due for recurring billing.
   * Fully idempotent, transactional, and error resilient.
   */
  static async executeBillingRun(executedBy: string = 'SCHEDULER'): Promise<BillingRunResult> {
    const runNumber = `RUN-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const startTime = new Date();

    logger.info({ runNumber, executedBy }, 'Initiating recurring billing run');

    // Create BillingRun record
    const run = await prisma.billingRun.create({
      data: {
        runNumber,
        startTime,
        executedBy,
        status: 'RUNNING',
      },
    });

    let processedCount = 0;
    let createdCount = 0;
    let skippedCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    const now = new Date();

    // 1. Identify subscriptions due for billing: ACTIVE and nextBillingDate <= now
    const eligibleSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        nextBillingDate: { lte: now },
      },
      include: {
        customer: { include: { user: true } },
        plan: true,
        lines: { include: { product: true, variant: true } },
      },
    });

    logger.info(
      { count: eligibleSubscriptions.length, runNumber },
      'Found subscriptions eligible for recurring billing'
    );

    for (const subscription of eligibleSubscriptions) {
      processedCount++;
      const periodStart = subscription.nextBillingDate || now;
      const periodEnd = calculateBillingPeriodEnd(periodStart, subscription.billingFrequency);

      try {
        // 2. Check idempotency: does an invoice already exist for this subscription and period?
        const existingInvoice = await prisma.invoice.findFirst({
          where: {
            subscriptionId: subscription.id,
            billingPeriodStart: periodStart,
          },
        });

        if (existingInvoice) {
          skippedCount++;
          await prisma.billingRunItem.create({
            data: {
              billingRunId: run.id,
              subscriptionId: subscription.id,
              invoiceId: existingInvoice.id,
              status: 'SKIPPED',
              message: `Idempotent skip: Invoice ${existingInvoice.invoiceNumber} already exists for this billing period.`,
            },
          });
          continue;
        }

        // 3. Transactionally generate the recurring invoice and advance next billing date
        const invoice = await prisma.$transaction(async (tx) => {
          let subtotal = 0;
          let totalQty = 0;
          const lineCalculations = [];
          const productIds: string[] = [];

          for (const line of subscription.lines) {
            const calc = await PricingService.calculateProductLine(
              line.productId,
              line.variantId,
              line.quantity
            );
            lineCalculations.push(calc);
            subtotal += calc.lineSubtotal;
            totalQty += line.quantity;
            productIds.push(line.productId);
          }

          // Evaluate taxes
          const taxResult = await TaxService.calculateTaxes(subtotal);

          const totalAmount = Number((subtotal + taxResult.totalTaxAmount).toFixed(2));
          const dueDate = calculateDueDate(now, subscription.paymentTermsDays || 0);
          const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

          // Create Invoice
          const newInvoice = await tx.invoice.create({
            data: {
              invoiceNumber,
              customerId: subscription.customerId,
              subscriptionId: subscription.id,
              billingPeriodStart: periodStart,
              billingPeriodEnd: periodEnd,
              invoiceDate: now,
              dueDate,
              subtotal,
              taxAmount: taxResult.totalTaxAmount,
              discountAmount: 0,
              totalAmount,
              amountPaid: 0,
              balance: totalAmount,
              currency: 'INR',
              status: 'CONFIRMED', // Recurring invoices are issued in CONFIRMED state
              idempotencyKey: `sub_${subscription.id}_${periodStart.toISOString()}`,
              confirmedAt: now,
            },
          });

          // Create invoice line items with snapshots
          for (const calc of lineCalculations) {
            await tx.invoiceLine.create({
              data: {
                invoiceId: newInvoice.id,
                productId: calc.productId,
                variantId: calc.variantId,
                description: `${calc.productName}${calc.variantName ? ` (${calc.variantName})` : ''}`,
                quantity: calc.quantity,
                unitPrice: calc.finalUnitPrice,
                subtotal: calc.lineSubtotal,
                totalAmount: calc.lineSubtotal,
              },
            });
          }

          // Create invoice tax snapshots
          for (const tax of taxResult.taxes) {
            await tx.invoiceTax.create({
              data: {
                invoiceId: newInvoice.id,
                taxRuleId: tax.taxRuleId,
                taxName: tax.taxName,
                taxRate: tax.taxRate,
                taxAmount: tax.taxAmount,
              },
            });
          }

          // Advance nextBillingDate on subscription
          const nextDate = calculateNextBillingDate(periodStart, subscription.billingFrequency);
          await tx.subscription.update({
            where: { id: subscription.id },
            data: {
              nextBillingDate: nextDate,
            },
          });

          return newInvoice;
        });

        createdCount++;

        // Record billing run item success
        await prisma.billingRunItem.create({
          data: {
            billingRunId: run.id,
            subscriptionId: subscription.id,
            invoiceId: invoice.id,
            status: 'SUCCESS',
            message: `Created invoice ${invoice.invoiceNumber} for amount ₹${invoice.totalAmount}`,
          },
        });

        // Dispatch invoice email asynchronously
        if (subscription.customer?.user?.email) {
          EmailService.sendInvoiceEmail(
            subscription.customer.user.email,
            invoice.invoiceNumber,
            `₹${invoice.totalAmount}`,
            invoice.dueDate.toLocaleDateString(),
            `${config.webAppUrl}/portal/invoices`
          ).catch((e) => logger.warn({ err: e }, 'Failed to send invoice notification email'));
        }
      } catch (err: any) {
        failureCount++;
        const errMsg = `Subscription ${subscription.subscriptionNumber}: ${err.message || 'Billing error'}`;
        errors.push(errMsg);
        logger.error({ err, subscriptionId: subscription.id }, 'Recurring billing item failed');

        await prisma.billingRunItem.create({
          data: {
            billingRunId: run.id,
            subscriptionId: subscription.id,
            status: 'FAILED',
            message: errMsg,
          },
        });

        // Create system alert for administrative review
        await prisma.systemAlert.create({
          data: {
            alertType: 'BILLING_FAILED',
            severity: 'HIGH',
            title: `Billing failure for ${subscription.subscriptionNumber}`,
            message: errMsg,
            entityType: 'SUBSCRIPTION',
            entityId: subscription.id,
          },
        });
      }
    }

    const finalStatus =
      failureCount === 0
        ? 'COMPLETED'
        : createdCount > 0
        ? 'PARTIAL'
        : 'FAILED';

    const endTime = new Date();

    await prisma.billingRun.update({
      where: { id: run.id },
      data: {
        endTime,
        status: finalStatus,
        subscriptionsProcessed: processedCount,
        invoicesCreated: createdCount,
        subscriptionsSkipped: skippedCount,
        failureCount,
        errorSummary: errors.length > 0 ? errors.join('\n') : null,
      },
    });

    logger.info(
      { runNumber, finalStatus, processedCount, createdCount, skippedCount, failureCount },
      'Recurring billing run finished'
    );

    return {
      runId: run.id,
      runNumber,
      status: finalStatus,
      subscriptionsProcessed: processedCount,
      invoicesCreated: createdCount,
      subscriptionsSkipped: skippedCount,
      failureCount,
      errorSummary: errors.join('\n'),
    };
  }
}
