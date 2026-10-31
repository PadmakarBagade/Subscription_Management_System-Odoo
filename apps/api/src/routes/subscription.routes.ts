import { Router, Request, Response, NextFunction } from 'express';
import { SubscriptionCreateSchema, SubscriptionActionSchema } from '@brightloop/shared';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requireRole } from '../middleware/auth';
import { PricingService } from '../services/pricingService';
import { DiscountService } from '../services/discountService';
import { TaxService } from '../services/taxService';
import { AuditService } from '../services/auditService';
import { calculateNextBillingDate } from '../utils/date';

const router = Router();

router.use(authenticate);

// -------------------------------------------------------------
// GET /api/v1/subscriptions (List subscriptions)
// -------------------------------------------------------------
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const status = req.query.status as string;
    const planId = req.query.planId as string;
    const search = (req.query.search as string || '').trim();
    const skip = (page - 1) * limit;

    const where: any = {};

    // Customer scoping
    if (req.user!.role === 'CUSTOMER') {
      where.customerId = req.user!.customerId;
    }

    if (status) {
      where.status = status;
    }

    if (planId) {
      where.planId = planId;
    }

    if (search) {
      where.OR = [
        { subscriptionNumber: { contains: search, mode: 'insensitive' } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
        { customer: { user: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [total, subscriptions] = await Promise.all([
      prisma.subscription.count({ where }),
      prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { include: { user: { select: { name: true, email: true } } } },
          plan: true,
          lines: { include: { product: true, variant: true } },
          _count: { select: { invoices: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: subscriptions,
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
// POST /api/v1/subscriptions (Create subscription)
// -------------------------------------------------------------
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = SubscriptionCreateSchema.parse(req.body);

    // If customer role, customerId must match their own
    let targetCustomerId = validated.customerId;
    if (req.user!.role === 'CUSTOMER') {
      targetCustomerId = req.user!.customerId!;
    }

    const plan = await prisma.plan.findUnique({
      where: { id: validated.planId },
    });
    if (!plan || !plan.isActive) {
      throw new AppError('Selected subscription plan is not available', 400);
    }

    // Check plan availability dates
    const now = new Date();
    if (plan.availabilityStart && now < plan.availabilityStart) {
      throw new AppError('Selected plan is not yet open for subscriptions', 400);
    }
    if (plan.availabilityEnd && now > plan.availabilityEnd) {
      throw new AppError('Selected plan is expired and no longer accepts new subscriptions', 400);
    }

    // Check total quantities against plan minimum
    const totalQty = validated.lines.reduce((sum, l) => sum + l.quantity, 0);
    if (totalQty < plan.minimumQuantity) {
      throw new AppError(
        `Plan requires a minimum order quantity of ${plan.minimumQuantity} units (provided: ${totalQty})`,
        400
      );
    }

    // Authoritative calculation of lines
    let subtotal = 0;
    const calculatedLines: any[] = [];
    const productIds: string[] = [];

    for (const line of validated.lines) {
      const calc = await PricingService.calculateProductLine(
        line.productId,
        line.variantId,
        line.quantity
      );
      calculatedLines.push(calc);
      subtotal += calc.lineSubtotal;
      productIds.push(line.productId);
    }

    // Evaluate discount
    let discountResult = null;
    let discountAmount = 0;
    if (validated.discountCode) {
      discountResult = await DiscountService.evaluateDiscount(
        validated.discountCode,
        subtotal,
        totalQty,
        productIds
      );
      if (discountResult) {
        discountAmount = discountResult.discountAmount;
      }
    }

    const netTaxable = Math.max(0, subtotal - discountAmount);
    const taxResult = await TaxService.calculateTaxes(netTaxable);
    const totalAmount = Number((netTaxable + taxResult.totalTaxAmount).toFixed(2));

    const subscriptionNumber = `SUB-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const startDate = validated.startDate || now;
    const nextBillingDate = calculateNextBillingDate(startDate, validated.billingFrequency || plan.billingFrequency);

    const subscription = await prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.create({
        data: {
          subscriptionNumber,
          customerId: targetCustomerId,
          planId: plan.id,
          quotationId: validated.quotationId || null,
          status: 'DRAFT',
          startDate,
          nextBillingDate,
          billingFrequency: validated.billingFrequency || plan.billingFrequency,
          paymentTermType: validated.paymentTermType || 'IMMEDIATE',
          autoRenew: validated.autoRenew !== undefined ? validated.autoRenew : true,
          subtotal,
          taxAmount: taxResult.totalTaxAmount,
          discountAmount,
          totalAmount,
          createdById: req.user!.id,
        },
      });

      for (const line of calculatedLines) {
        await tx.subscriptionLine.create({
          data: {
            subscriptionId: sub.id,
            productId: line.productId,
            variantId: line.variantId,
            quantity: line.quantity,
            unitPrice: line.finalUnitPrice,
            subtotal: line.lineSubtotal,
            taxAmount: 0,
            discountAmount: 0,
            totalAmount: line.lineSubtotal,
          },
        });
      }

      // Record discount usage if applied
      if (discountResult) {
        await tx.discountUsage.create({
          data: {
            discountId: discountResult.discountRuleId,
            customerId: targetCustomerId,
            subscriptionId: sub.id,
            discountAmount,
          },
        });

        await tx.discountRule.update({
          where: { id: discountResult.discountRuleId },
          data: { usageCount: { increment: 1 } },
        });
      }

      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: sub.id,
          toStatus: 'DRAFT',
          action: 'CREATED',
          actorId: req.user!.id,
          reason: 'Initial subscription creation',
        },
      });

      return tx.subscription.findUnique({
        where: { id: sub.id },
        include: {
          customer: { include: { user: true } },
          plan: true,
          lines: { include: { product: true, variant: true } },
        },
      });
    });

    await AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'SUBSCRIPTION_CREATED',
      entityType: 'Subscription',
      entityId: subscription!.id,
      afterState: subscription,
    });

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// GET /api/v1/subscriptions/:id (Subscription details)
// -------------------------------------------------------------
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: req.params.id },
      include: {
        customer: { include: { user: true } },
        plan: true,
        lines: { include: { product: true, variant: true } },
        history: { orderBy: { createdAt: 'desc' } },
        invoices: { orderBy: { invoiceDate: 'desc' } },
      },
    });

    if (!subscription) {
      throw new AppError('Subscription not found', 404);
    }

    if (req.user!.role === 'CUSTOMER' && subscription.customerId !== req.user!.customerId) {
      throw new AppError('Forbidden: Access denied to subscription', 403);
    }

    res.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// POST /api/v1/subscriptions/:id/pause
// -------------------------------------------------------------
router.post('/:id/pause', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { id: req.params.id },
      include: { plan: true },
    });

    if (!sub) throw new AppError('Subscription not found', 404);
    if (req.user!.role === 'CUSTOMER' && sub.customerId !== req.user!.customerId) {
      throw new AppError('Forbidden: Access denied', 403);
    }

    if (sub.status !== 'ACTIVE') {
      throw new AppError(`Cannot pause subscription with status ${sub.status}. Only ACTIVE subscriptions can be paused.`, 400);
    }

    if (!sub.plan.allowPause) {
      throw new AppError('This subscription plan policy does not allow pausing.', 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const s = await tx.subscription.update({
        where: { id: sub.id },
        data: {
          status: 'PAUSED',
          pausedAt: new Date(),
        },
      });

      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: sub.id,
          fromStatus: 'ACTIVE',
          toStatus: 'PAUSED',
          action: 'PAUSED',
          actorId: req.user!.id,
          reason: req.body.reason || 'User requested pause',
        },
      });

      return s;
    });

    res.json({
      success: true,
      message: 'Subscription paused successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// POST /api/v1/subscriptions/:id/resume
// -------------------------------------------------------------
router.post('/:id/resume', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { id: req.params.id },
      include: { plan: true },
    });

    if (!sub) throw new AppError('Subscription not found', 404);
    if (req.user!.role === 'CUSTOMER' && sub.customerId !== req.user!.customerId) {
      throw new AppError('Forbidden: Access denied', 403);
    }

    if (sub.status !== 'PAUSED') {
      throw new AppError('Only PAUSED subscriptions can be resumed', 400);
    }

    const nextBillingDate = calculateNextBillingDate(new Date(), sub.billingFrequency);

    const updated = await prisma.$transaction(async (tx) => {
      const s = await tx.subscription.update({
        where: { id: sub.id },
        data: {
          status: 'ACTIVE',
          pausedAt: null,
          nextBillingDate,
        },
      });

      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: sub.id,
          fromStatus: 'PAUSED',
          toStatus: 'ACTIVE',
          action: 'RESUMED',
          actorId: req.user!.id,
          reason: 'Subscription resumed',
        },
      });

      return s;
    });

    res.json({
      success: true,
      message: 'Subscription resumed successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// POST /api/v1/subscriptions/:id/renew
// -------------------------------------------------------------
router.post('/:id/renew', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { id: req.params.id },
      include: { plan: true },
    });

    if (!sub) throw new AppError('Subscription not found', 404);
    if (req.user!.role === 'CUSTOMER' && sub.customerId !== req.user!.customerId) {
      throw new AppError('Forbidden: Access denied', 403);
    }

    if (!sub.plan.allowRenewal) {
      throw new AppError('Plan policy does not permit renewals', 400);
    }

    const currentBilling = sub.nextBillingDate || new Date();
    const newNextBilling = calculateNextBillingDate(currentBilling, sub.billingFrequency);

    const updated = await prisma.$transaction(async (tx) => {
      const s = await tx.subscription.update({
        where: { id: sub.id },
        data: {
          status: 'ACTIVE',
          nextBillingDate: newNextBilling,
        },
      });

      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: sub.id,
          fromStatus: sub.status,
          toStatus: 'ACTIVE',
          action: 'RENEWED',
          actorId: req.user!.id,
          reason: 'Manual or authorized renewal',
        },
      });

      return s;
    });

    res.json({
      success: true,
      message: 'Subscription renewed successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// POST /api/v1/subscriptions/:id/cancel
// -------------------------------------------------------------
router.post('/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { id: req.params.id },
      include: { plan: true },
    });

    if (!sub) throw new AppError('Subscription not found', 404);
    if (req.user!.role === 'CUSTOMER' && sub.customerId !== req.user!.customerId) {
      throw new AppError('Forbidden: Access denied', 403);
    }

    if (sub.status === 'CLOSED') {
      throw new AppError('Subscription is already closed', 400);
    }

    if (req.user!.role === 'CUSTOMER' && !sub.plan.allowEarlyClosure) {
      throw new AppError('Plan policy does not permit self-service early closure. Please contact support.', 400);
    }

    const reason = req.body.reason || 'User cancelled subscription';

    const updated = await prisma.$transaction(async (tx) => {
      const s = await tx.subscription.update({
        where: { id: sub.id },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          cancelReason: reason,
        },
      });

      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: sub.id,
          fromStatus: sub.status,
          toStatus: 'CLOSED',
          action: 'CLOSED',
          actorId: req.user!.id,
          reason,
        },
      });

      return s;
    });

    res.json({
      success: true,
      message: 'Subscription closed successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
