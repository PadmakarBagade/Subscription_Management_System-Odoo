import { Router, Request, Response, NextFunction } from 'express';
import { QuotationCreateSchema } from '@brightloop/shared';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requireRole, requireCustomerOwnership } from '../middleware/auth';
import { PricingService } from '../services/pricingService';
import { TaxService } from '../services/taxService';
import { PdfService } from '../services/pdfService';
import { AuditService } from '../services/auditService';
import { calculateNextBillingDate } from '../utils/date';

const router = Router();

router.use(authenticate);

// -------------------------------------------------------------
// GET /api/v1/quotations (List quotations)
// -------------------------------------------------------------
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where: any = {};

    // If CUSTOMER, only show own quotations
    if (req.user!.role === 'CUSTOMER') {
      where.customerId = req.user!.customerId;
    }

    const quotations = await prisma.quotation.findMany({
      where,
      include: {
        customer: { include: { user: { select: { name: true, email: true } } } },
        plan: true,
        lines: { include: { product: true, variant: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: quotations,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// POST /api/v1/quotations (Create quotation) - ADMIN or STAFF
// -------------------------------------------------------------
router.post('/', requireRole('ADMIN', 'STAFF'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = QuotationCreateSchema.parse(req.body);

    const plan = await prisma.plan.findUnique({
      where: { id: validated.planId },
    });
    if (!plan) {
      throw new AppError('Plan not found', 404);
    }

    const customer = await prisma.customerProfile.findUnique({
      where: { id: validated.customerId },
    });
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    // Authoritative calculation of lines
    let subtotal = 0;
    const calculatedLines: any[] = [];

    for (const line of validated.lines) {
      const calc = await PricingService.calculateProductLine(
        line.productId,
        line.variantId,
        line.quantity
      );
      calculatedLines.push(calc);
      subtotal += calc.lineSubtotal;
    }

    // Calculate taxes on subtotal
    const taxResult = await TaxService.calculateTaxes(subtotal);
    const totalAmount = Number((subtotal + taxResult.totalTaxAmount).toFixed(2));

    const quotationNumber = `QUO-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const validityDate = new Date();
    validityDate.setDate(validityDate.getDate() + (validated.validityDays || 30));

    const quotation = await prisma.$transaction(async (tx) => {
      const q = await tx.quotation.create({
        data: {
          quotationNumber,
          customerId: validated.customerId,
          planId: validated.planId,
          templateId: validated.templateId || null,
          validityDate,
          status: 'DRAFT',
          subtotal,
          taxAmount: taxResult.totalTaxAmount,
          discountAmount: 0,
          totalAmount,
          notes: validated.notes || null,
          createdById: req.user!.id,
        },
      });

      for (const line of calculatedLines) {
        await tx.quotationLine.create({
          data: {
            quotationId: q.id,
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

      return tx.quotation.findUnique({
        where: { id: q.id },
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
      action: 'QUOTATION_CREATED',
      entityType: 'Quotation',
      entityId: quotation!.id,
      afterState: quotation,
    });

    res.status(201).json({
      success: true,
      message: 'Quotation created successfully',
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// GET /api/v1/quotations/:id (Quotation detail)
// -------------------------------------------------------------
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: {
        customer: { include: { user: true } },
        plan: true,
        lines: { include: { product: true, variant: true } },
      },
    });

    if (!quotation) {
      throw new AppError('Quotation not found', 404);
    }

    if (req.user!.role === 'CUSTOMER' && quotation.customerId !== req.user!.customerId) {
      throw new AppError('Forbidden: Access denied to quotation', 403);
    }

    res.json({
      success: true,
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// POST /api/v1/quotations/:id/confirm (Confirm quotation -> Subscription)
// -------------------------------------------------------------
router.post('/:id/confirm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: {
        plan: true,
        lines: true,
      },
    });

    if (!quotation) {
      throw new AppError('Quotation not found', 404);
    }

    // Role check: Admin, Staff, or Customer who owns the quotation
    if (req.user!.role === 'CUSTOMER' && quotation.customerId !== req.user!.customerId) {
      throw new AppError('Forbidden: Access denied to quotation', 403);
    }

    // Check expiration
    if (new Date() > quotation.validityDate) {
      throw new AppError('Cannot confirm expired quotation', 400);
    }

    if (quotation.status === 'CONFIRMED') {
      throw new AppError('Quotation has already been confirmed', 400);
    }

    if (quotation.status === 'CANCELLED') {
      throw new AppError('Cannot confirm a cancelled quotation', 400);
    }

    // Transition quotation to CONFIRMED and create a Subscription
    const subscription = await prisma.$transaction(async (tx) => {
      await tx.quotation.update({
        where: { id: quotation.id },
        data: { status: 'CONFIRMED' },
      });

      const subscriptionNumber = `SUB-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      const startDate = new Date();
      const nextBillingDate = calculateNextBillingDate(startDate, quotation.plan.billingFrequency);

      const sub = await tx.subscription.create({
        data: {
          subscriptionNumber,
          customerId: quotation.customerId,
          planId: quotation.planId,
          quotationId: quotation.id,
          status: 'CONFIRMED',
          startDate,
          nextBillingDate,
          billingFrequency: quotation.plan.billingFrequency,
          subtotal: quotation.subtotal,
          taxAmount: quotation.taxAmount,
          discountAmount: quotation.discountAmount,
          totalAmount: quotation.totalAmount,
          createdById: req.user!.id,
        },
      });

      // Copy line items
      for (const line of quotation.lines) {
        await tx.subscriptionLine.create({
          data: {
            subscriptionId: sub.id,
            productId: line.productId,
            variantId: line.variantId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            subtotal: line.subtotal,
            taxAmount: line.taxAmount,
            discountAmount: line.discountAmount,
            totalAmount: line.totalAmount,
          },
        });
      }

      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: sub.id,
          fromStatus: 'QUOTATION',
          toStatus: 'CONFIRMED',
          action: 'QUOTATION_CONFIRMED',
          actorId: req.user!.id,
          reason: `Confirmed from quotation ${quotation.quotationNumber}`,
        },
      });

      return tx.subscription.findUnique({
        where: { id: sub.id },
        include: { plan: true, lines: true },
      });
    });

    await AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'QUOTATION_CONFIRMED',
      entityType: 'Quotation',
      entityId: quotation.id,
      afterState: { subscriptionId: subscription!.id },
    });

    res.json({
      success: true,
      message: 'Quotation confirmed and subscription generated successfully',
      data: { quotation, subscription },
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// GET /api/v1/quotations/:id/pdf (Download Quotation PDF)
// -------------------------------------------------------------
router.get('/:id/pdf', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: {
        customer: { include: { user: true } },
        plan: true,
        lines: { include: { product: true, variant: true } },
      },
    });

    if (!quotation) {
      throw new AppError('Quotation not found', 404);
    }

    if (req.user!.role === 'CUSTOMER' && quotation.customerId !== req.user!.customerId) {
      throw new AppError('Forbidden: Access denied to quotation', 403);
    }

    const pdfBuffer = await PdfService.generateQuotationPdf(quotation);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Quotation-${quotation.quotationNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

export default router;
