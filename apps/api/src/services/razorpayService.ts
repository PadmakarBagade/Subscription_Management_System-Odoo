import crypto from 'crypto';
import Razorpay from 'razorpay';
import { config } from '../config';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { EmailService } from './emailService';

export class RazorpayService {
  private static instance: Razorpay | null = null;

  private static getClient(): Razorpay | null {
    if (!this.instance && config.razorpay.keyId && config.razorpay.keyId !== 'rzp_test_placeholder_key_id') {
      this.instance = new Razorpay({
        key_id: config.razorpay.keyId,
        key_secret: config.razorpay.keySecret,
      });
    }
    return this.instance;
  }

  /**
   * Creates an authoritative Razorpay Order for an invoice or subscription checkout.
   */
  static async createOrder(params: {
    amountInRupees: number;
    receipt: string;
    customerId: string;
    invoiceId?: string | null;
    subscriptionId?: string | null;
  }) {
    const { amountInRupees, receipt, customerId, invoiceId, subscriptionId } = params;

    if (amountInRupees <= 0) {
      throw new AppError('Payable amount must be greater than zero', 400);
    }

    const amountInPaise = Math.round(amountInRupees * 100);
    const client = this.getClient();

    let orderId: string;
    let rawResponse: any = null;

    if (client) {
      try {
        const order = await client.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt,
          notes: {
            customerId,
            invoiceId: invoiceId || '',
            subscriptionId: subscriptionId || '',
          },
        });
        orderId = order.id;
        rawResponse = order;
      } catch (err: any) {
        logger.error({ err }, 'Razorpay API order creation failed');
        throw new AppError(`Payment provider error: ${err.message || 'Failed to create order'}`, 502);
      }
    } else {
      // In development / test mode with placeholder keys, generate a deterministic test order
      orderId = `order_test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      rawResponse = { id: orderId, entity: 'order', amount: amountInPaise, currency: 'INR', status: 'created' };
      logger.info({ orderId, amountInPaise }, 'Created development test Razorpay Order');
    }

    // Persist order in database
    const savedOrder = await prisma.razorpayOrder.create({
      data: {
        orderId,
        customerId,
        invoiceId,
        subscriptionId,
        amountInPaise: BigInt(amountInPaise),
        currency: 'INR',
        receipt,
        status: 'CREATED',
        rawResponse,
      },
    });

    // Record pending payment attempt
    await prisma.paymentAttempt.create({
      data: {
        customerId,
        invoiceId,
        subscriptionId,
        amount: amountInRupees,
        currency: 'INR',
        provider: 'RAZORPAY',
        orderId,
        status: 'INITIATED',
      },
    });

    return {
      orderId: savedOrder.orderId,
      amount: amountInRupees,
      amountInPaise,
      currency: 'INR',
      keyId: config.razorpay.keyId,
    };
  }

  /**
   * Verifies the HMAC-SHA256 signature returned by Razorpay Checkout.
   */
  static verifyPaymentSignature(params: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean {
    const { orderId, paymentId, signature } = params;

    // In dev mode when placeholder keys are used, accept standard test signatures
    if (config.razorpay.keyId === 'rzp_test_placeholder_key_id') {
      if (signature.startsWith('mock_sig_') || signature.length === 64) {
        return true;
      }
    }

    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(payload)
      .digest('hex');

    const bufA = Buffer.from(signature, 'utf-8');
    const bufB = Buffer.from(expectedSignature, 'utf-8');

    if (bufA.length !== bufB.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Validates Razorpay Webhook HMAC-SHA256 signature against the raw body buffer.
   */
  static verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
    if (!signature || !config.razorpay.webhookSecret) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.webhookSecret)
      .update(rawBody)
      .digest('hex');

    const bufA = Buffer.from(signature, 'utf-8');
    const bufB = Buffer.from(expectedSignature, 'utf-8');

    if (bufA.length !== bufB.length) {
      return false;
    }

    try {
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }

  /**
   * Transactionally processes and reconciles a successful payment.
   */
  static async reconcilePayment(params: {
    orderId: string;
    paymentId: string;
    invoiceId?: string | null;
    subscriptionId?: string | null;
  }) {
    const { orderId, paymentId, invoiceId, subscriptionId } = params;

    return prisma.$transaction(async (tx) => {
      // 1. Check if this provider payment ID has already been recorded
      const existingPayment = await tx.payment.findFirst({
        where: { providerPaymentId: paymentId },
      });
      if (existingPayment) {
        logger.warn({ paymentId }, 'Payment already reconciled. Idempotent skip.');
        return existingPayment;
      }

      // 2. Lookup order
      const order = await tx.razorpayOrder.findUnique({
        where: { orderId },
        include: { invoice: true, subscription: true },
      });

      if (!order) {
        throw new AppError(`Order reference ${orderId} not found in database`, 404);
      }

      const paymentAmount = Number(order.amountInPaise) / 100;
      const targetInvoiceId = invoiceId || order.invoiceId;
      const targetSubscriptionId = subscriptionId || order.subscriptionId;

      // 3. Create verified Payment record
      const paymentNumber = `PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          invoiceId: targetInvoiceId,
          customerId: order.customerId,
          paymentMethod: 'RAZORPAY',
          amount: paymentAmount,
          status: 'SUCCESS',
          providerPaymentId: paymentId,
          referenceNumber: orderId,
          notes: 'Verified online payment via Razorpay',
        },
      });

      // 4. Update RazorpayOrder status
      await tx.razorpayOrder.update({
        where: { id: order.id },
        data: { status: 'PAID' },
      });

      // 5. Update Invoice balance if an invoice is linked
      if (targetInvoiceId) {
        const inv = await tx.invoice.findUnique({
          where: { id: targetInvoiceId },
        });

        if (inv) {
          const newAmountPaid = Number(inv.amountPaid) + paymentAmount;
          const newBalance = Math.max(0, Number(inv.totalAmount) - newAmountPaid);
          const isFullyPaid = newBalance <= 0.01;

          await tx.invoice.update({
            where: { id: targetInvoiceId },
            data: {
              amountPaid: newAmountPaid,
              balance: newBalance,
              status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
              paidAt: isFullyPaid ? new Date() : inv.paidAt,
            },
          });

          // Create payment allocation
          await tx.invoicePaymentAllocation.create({
            data: {
              invoiceId: targetInvoiceId,
              paymentId: payment.id,
              allocatedAmount: paymentAmount,
            },
          });
        }
      }

      // 6. Activate or renew Subscription if linked
      if (targetSubscriptionId) {
        const sub = await tx.subscription.findUnique({
          where: { id: targetSubscriptionId },
        });

        if (sub && (sub.status === 'CONFIRMED' || sub.status === 'DRAFT' || sub.status === 'QUOTATION')) {
          await tx.subscription.update({
            where: { id: targetSubscriptionId },
            data: {
              status: 'ACTIVE',
            },
          });

          await tx.subscriptionHistory.create({
            data: {
              subscriptionId: targetSubscriptionId,
              fromStatus: sub.status,
              toStatus: 'ACTIVE',
              action: 'PAYMENT_ACTIVATED',
              reason: `Subscription activated upon successful Razorpay payment ${paymentNumber}`,
            },
          });
        }
      }

      return payment;
    });
  }
}
