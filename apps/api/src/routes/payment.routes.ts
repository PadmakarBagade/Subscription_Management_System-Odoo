import { Router, Request, Response, NextFunction } from 'express';
import { RazorpayOrderCreateSchema, RazorpayVerifySchema, ManualPaymentCreateSchema } from '@brightloop/shared';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requireRole } from '../middleware/auth';
import { RazorpayService } from '../services/razorpayService';
import { AuditService } from '../services/auditService';
import { EmailService } from '../services/emailService';
import { logger } from '../utils/logger';

const router = Router();

// -------------------------------------------------------------
// POST /api/v1/payments/razorpay/order (Create Checkout Order)
// -------------------------------------------------------------
router.post('/razorpay/order', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = RazorpayOrderCreateSchema.parse(req.body);

    let amount = 0;
    let targetCustomerId = req.user!.customerId!;
    let receipt = `rcpt_${Date.now()}`;

    if (validated.invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: validated.invoiceId },
      });
      if (!invoice) throw new AppError('Invoice not found', 404);

      if (req.user!.role === 'CUSTOMER' && invoice.customerId !== req.user!.customerId) {
        throw new AppError('Forbidden: Access denied to invoice', 403);
      }

      if (Number(invoice.balance) <= 0) {
        throw new AppError('This invoice has already been fully paid.', 400);
      }

      amount = Number(invoice.balance);
      targetCustomerId = invoice.customerId;
      receipt = `inv_${invoice.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '')}`;
    } else if (validated.subscriptionId) {
      const subscription = await prisma.subscription.findUnique({
        where: { id: validated.subscriptionId },
      });
      if (!subscription) throw new AppError('Subscription not found', 404);

      if (req.user!.role === 'CUSTOMER' && subscription.customerId !== req.user!.customerId) {
        throw new AppError('Forbidden: Access denied to subscription', 403);
      }

      amount = Number(subscription.totalAmount);
      targetCustomerId = subscription.customerId;
      receipt = `sub_${subscription.subscriptionNumber.replace(/[^a-zA-Z0-9]/g, '')}`;
    } else if (validated.planId) {
      const plan = await prisma.plan.findUnique({
        where: { id: validated.planId },
      });
      if (!plan) throw new AppError('Plan not found', 404);

      amount = Number(plan.basePrice);
      receipt = `plan_${plan.code}`;
    } else {
      throw new AppError('Must specify either invoiceId, subscriptionId, or planId', 400);
    }

    const orderData = await RazorpayService.createOrder({
      amountInRupees: amount,
      receipt,
      customerId: targetCustomerId,
      invoiceId: validated.invoiceId,
      subscriptionId: validated.subscriptionId,
    });

    res.json({
      success: true,
      data: orderData,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// POST /api/v1/payments/razorpay/verify (Verify Checkout Signature)
// -------------------------------------------------------------
router.post('/razorpay/verify', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = RazorpayVerifySchema.parse(req.body);

    const isValid = RazorpayService.verifyPaymentSignature({
      orderId: validated.razorpay_order_id,
      paymentId: validated.razorpay_payment_id,
      signature: validated.razorpay_signature,
    });

    if (!isValid) {
      logger.warn({ orderId: validated.razorpay_order_id }, 'Payment signature verification failed');
      throw new AppError('Invalid payment signature verification failed', 400);
    }

    // Authoritative transactional reconciliation
    const payment = await RazorpayService.reconcilePayment({
      orderId: validated.razorpay_order_id,
      paymentId: validated.razorpay_payment_id,
      invoiceId: validated.invoiceId,
      subscriptionId: validated.subscriptionId,
    });

    await AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'PAYMENT_VERIFIED',
      entityType: 'Payment',
      entityId: payment.id,
      afterState: payment,
    });

    res.json({
      success: true,
      message: 'Payment verified and applied successfully',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// POST /api/v1/payments/razorpay/webhook (Webhook Ingestion)
// Note: Handled with raw body verification before body parsing
// -------------------------------------------------------------
router.post('/razorpay/webhook', async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);

  if (!signature) {
    return res.status(400).json({ success: false, error: 'Missing webhook signature' });
  }

  const isValid = RazorpayService.verifyWebhookSignature(rawBody, signature);
  if (!isValid && process.env.NODE_ENV === 'production') {
    logger.warn('Invalid Razorpay webhook signature');
    return res.status(400).json({ success: false, error: 'Invalid webhook signature' });
  }

  const event = req.body;
  const eventId = event.event_id || event.id || `evt_${Date.now()}`;

  try {
    // Check idempotency: deduplicate webhook event
    const existing = await prisma.webhookEvent.findUnique({
      where: { eventId },
    });
    if (existing && existing.processed) {
      return res.status(200).json({ success: true, message: 'Event already processed' });
    }

    await prisma.webhookEvent.upsert({
      where: { eventId },
      create: {
        eventId,
        eventType: event.event || 'unknown',
        payload: event,
        processed: false,
      },
      update: {},
    });

    // Handle payment.captured event
    if (event.event === 'payment.captured' && event.payload?.payment?.entity) {
      const p = event.payload.payment.entity;
      const orderId = p.order_id;
      const paymentId = p.id;

      if (orderId) {
        await RazorpayService.reconcilePayment({
          orderId,
          paymentId,
        });
      }
    }

    await prisma.webhookEvent.update({
      where: { eventId },
      data: { processed: true, processedAt: new Date() },
    });

    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (err: any) {
    logger.error({ err, eventId }, 'Error processing webhook event');
    await prisma.webhookEvent.update({
      where: { eventId },
      data: { error: err.message },
    });
    res.status(500).json({ success: false, error: 'Webhook processing error' });
  }
});

// -------------------------------------------------------------
// POST /api/v1/payments/manual (Record Offline Payment) - ADMIN, STAFF
// -------------------------------------------------------------
router.post('/manual', authenticate, requireRole('ADMIN', 'STAFF'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = ManualPaymentCreateSchema.parse(req.body);

    const invoice = await prisma.invoice.findUnique({
      where: { id: validated.invoiceId },
      include: { customer: { include: { user: true } }, subscription: true },
    });

    if (!invoice) throw new AppError('Invoice not found', 404);

    if (validated.amount > Number(invoice.balance)) {
      throw new AppError(
        `Payment amount (₹${validated.amount}) cannot exceed current outstanding balance (₹${invoice.balance})`,
        400
      );
    }

    const paymentNumber = `PAY-MAN-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create payment record
      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          paymentMethod: validated.paymentMethod,
          amount: validated.amount,
          paymentDate: validated.paymentDate || new Date(),
          status: 'SUCCESS',
          referenceNumber: validated.referenceNumber || null,
          notes: validated.notes || 'Authorized manual offline payment recorded by staff',
          isStaffRecorded: true,
          createdById: req.user!.id,
        },
      });

      // 2. Allocate payment to invoice
      await tx.invoicePaymentAllocation.create({
        data: {
          invoiceId: invoice.id,
          paymentId: payment.id,
          allocatedAmount: validated.amount,
        },
      });

      // 3. Update invoice balance and status
      const newAmountPaid = Number(invoice.amountPaid) + validated.amount;
      const newBalance = Math.max(0, Number(invoice.totalAmount) - newAmountPaid);
      const isFullyPaid = newBalance <= 0.01;

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: newAmountPaid,
          balance: newBalance,
          status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
          paidAt: isFullyPaid ? new Date() : invoice.paidAt,
        },
      });

      // 4. If subscription exists and is in draft/confirmed, activate it
      if (invoice.subscriptionId) {
        const sub = await tx.subscription.findUnique({
          where: { id: invoice.subscriptionId },
        });

        if (sub && (sub.status === 'CONFIRMED' || sub.status === 'DRAFT')) {
          await tx.subscription.update({
            where: { id: sub.id },
            data: { status: 'ACTIVE' },
          });

          await tx.subscriptionHistory.create({
            data: {
              subscriptionId: sub.id,
              fromStatus: sub.status,
              toStatus: 'ACTIVE',
              action: 'MANUAL_PAYMENT_ACTIVATED',
              actorId: req.user!.id,
              reason: `Subscription activated upon manual offline payment ${paymentNumber}`,
            },
          });
        }
      }

      return { payment, invoice: updatedInvoice };
    });

    await AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'MANUAL_PAYMENT_RECORDED',
      entityType: 'Payment',
      entityId: result.payment.id,
      afterState: result.payment,
    });

    // Send receipt email
    if (invoice.customer?.user?.email) {
      EmailService.sendPaymentConfirmationEmail(
        invoice.customer.user.email,
        result.payment.paymentNumber,
        `₹${result.payment.amount}`,
        invoice.invoiceNumber
      ).catch(() => {});
    }

    res.status(201).json({
      success: true,
      message: 'Manual offline payment recorded successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// GET /api/v1/payments (List payments)
// -------------------------------------------------------------
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (req.user!.role === 'CUSTOMER') {
      where.customerId = req.user!.customerId;
    }

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paymentDate: 'desc' },
        include: {
          customer: { include: { user: { select: { name: true, email: true } } } },
          invoice: { select: { invoiceNumber: true, totalAmount: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// POST /api/v1/payments/:id/reverse (Reverse/Refund payment) - ADMIN only
// -------------------------------------------------------------
router.post('/:id/reverse', authenticate, requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: {
        allocations: {
          include: { invoice: true },
        },
      },
    });

    if (!payment) throw new AppError('Payment not found', 404);

    if (payment.status === 'REFUNDED') {
      throw new AppError('Payment has already been reversed/refunded', 400);
    }

    if (payment.status !== 'SUCCESS') {
      throw new AppError(`Cannot reverse payment with status ${payment.status}`, 400);
    }

    const reason = req.body.reason || 'Admin authorized payment reversal';

    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark payment as REFUNDED
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'REFUNDED',
          notes: payment.notes ? `${payment.notes} | Reversed: ${reason}` : `Reversed: ${reason}`,
        },
      });

      // 2. Adjust invoice balances
      for (const allocation of payment.allocations) {
        const inv = allocation.invoice;
        const newAmountPaid = Math.max(0, Number(inv.amountPaid) - Number(allocation.allocatedAmount));
        const newBalance = Math.min(Number(inv.totalAmount), Number(inv.balance) + Number(allocation.allocatedAmount));
        const newStatus = newAmountPaid <= 0 ? 'CONFIRMED' : 'PARTIALLY_PAID';

        await tx.invoice.update({
          where: { id: inv.id },
          data: {
            amountPaid: newAmountPaid,
            balance: newBalance,
            status: newStatus,
          },
        });
      }

      return updatedPayment;
    });

    await AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'PAYMENT_REVERSED',
      entityType: 'Payment',
      entityId: result.id,
      beforeState: payment,
      afterState: result,
    });

    res.json({
      success: true,
      message: 'Payment reversed and refunded successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
