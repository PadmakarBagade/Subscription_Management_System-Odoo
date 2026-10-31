import { Router, Request, Response, NextFunction } from 'express';
import { InvoiceCreateSchema } from '@brightloop/shared';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requireRole } from '../middleware/auth';
import { TaxService } from '../services/taxService';
import { PdfService } from '../services/pdfService';
import { AuditService } from '../services/auditService';
import { EmailService } from '../services/emailService';
import { config } from '../config';
import { sanitizeDataForRole } from '../utils/serializer';

const router = Router();

router.use(authenticate);

// -------------------------------------------------------------
// GET /api/v1/invoices (List invoices)
// -------------------------------------------------------------
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const status = req.query.status as string;
    const search = (req.query.search as string || '').trim();
    const skip = (page - 1) * limit;

    const where: any = {};

    // Customer scoping
    if (req.user!.role === 'CUSTOMER') {
      where.customerId = req.user!.customerId;
    }

    if (status) {
      if (status === 'OVERDUE') {
        where.balance = { gt: 0 };
        where.dueDate = { lt: new Date() };
        where.status = { notIn: ['CANCELLED', 'VOID', 'PAID'] };
      } else {
        where.status = status;
      }
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
        { customer: { user: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [total, invoices] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { invoiceDate: 'desc' },
        include: {
          customer: { include: { user: { select: { name: true, email: true } } } },
          subscription: { select: { subscriptionNumber: true, billingFrequency: true } },
          _count: { select: { lines: true, payments: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: sanitizeDataForRole(invoices, req.user?.role),
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
// POST /api/v1/invoices (Create manual draft invoice) - ADMIN, STAFF
// -------------------------------------------------------------
router.post('/', requireRole('ADMIN', 'STAFF'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = InvoiceCreateSchema.parse(req.body);

    const customer = await prisma.customerProfile.findUnique({
      where: { id: validated.customerId },
    });
    if (!customer) throw new AppError('Customer not found', 404);

    let subtotal = 0;
    for (const line of validated.lines) {
      subtotal += line.quantity * line.unitPrice;
    }

    const taxResult = await TaxService.calculateTaxes(subtotal);
    const totalAmount = Number((subtotal + taxResult.totalTaxAmount).toFixed(2));
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: validated.customerId,
          subscriptionId: validated.subscriptionId || null,
          invoiceDate: new Date(),
          dueDate: validated.dueDate,
          subtotal,
          taxAmount: taxResult.totalTaxAmount,
          discountAmount: 0,
          totalAmount,
          amountPaid: 0,
          balance: totalAmount,
          currency: 'INR',
          status: 'DRAFT',
          notes: validated.notes || null,
        },
      });

      for (const line of validated.lines) {
        const lineSubtotal = Number((line.quantity * line.unitPrice).toFixed(2));
        await tx.invoiceLine.create({
          data: {
            invoiceId: inv.id,
            productId: line.productId,
            variantId: line.variantId || null,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            subtotal: lineSubtotal,
            totalAmount: lineSubtotal,
          },
        });
      }

      for (const tax of taxResult.taxes) {
        await tx.invoiceTax.create({
          data: {
            invoiceId: inv.id,
            taxRuleId: tax.taxRuleId,
            taxName: tax.taxName,
            taxRate: tax.taxRate,
            taxAmount: tax.taxAmount,
          },
        });
      }

      return tx.invoice.findUnique({
        where: { id: inv.id },
        include: {
          customer: { include: { user: true } },
          lines: { include: { product: true } },
          taxes: true,
        },
      });
    });

    await AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'INVOICE_CREATED',
      entityType: 'Invoice',
      entityId: invoice!.id,
      afterState: invoice,
    });

    res.status(201).json({
      success: true,
      message: 'Draft invoice created successfully',
      data: sanitizeDataForRole(invoice, req.user?.role),
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// GET /api/v1/invoices/:id (Invoice details)
// -------------------------------------------------------------
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        customer: { include: { user: true } },
        subscription: true,
        lines: { include: { product: true, variant: true } },
        taxes: true,
        discounts: true,
        payments: { orderBy: { paymentDate: 'desc' } },
      },
    });

    if (!invoice) throw new AppError('Invoice not found', 404);

    if (req.user!.role === 'CUSTOMER' && invoice.customerId !== req.user!.customerId) {
      throw new AppError('Forbidden: Access denied to this invoice', 403);
    }

    res.json({
      success: true,
      data: sanitizeDataForRole(invoice, req.user?.role),
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// POST /api/v1/invoices/:id/confirm (Confirm invoice - locks immutability)
// -------------------------------------------------------------
router.post('/:id/confirm', requireRole('ADMIN', 'STAFF'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { customer: { include: { user: true } } },
    });

    if (!invoice) throw new AppError('Invoice not found', 404);
    if (invoice.status !== 'DRAFT') {
      throw new AppError(`Cannot confirm invoice with status ${invoice.status}`, 400);
    }

    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
      include: { customer: { include: { user: true } } },
    });

    await AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'INVOICE_CONFIRMED',
      entityType: 'Invoice',
      entityId: updated.id,
      beforeState: invoice,
      afterState: updated,
    });

    // Send invoice email asynchronously
    if (updated.customer?.user?.email) {
      EmailService.sendInvoiceEmail(
        updated.customer.user.email,
        updated.invoiceNumber,
        `₹${updated.totalAmount}`,
        updated.dueDate.toLocaleDateString(),
        `${config.webAppUrl}/portal/invoices`
      ).catch(() => {});
    }

    res.json({
      success: true,
      message: 'Invoice confirmed successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// POST /api/v1/invoices/:id/cancel (Cancel unpaid invoice) - ADMIN, STAFF
// -------------------------------------------------------------
router.post('/:id/cancel', requireRole('ADMIN', 'STAFF'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
    });

    if (!invoice) throw new AppError('Invoice not found', 404);

    if (invoice.status === 'PAID') {
      throw new AppError('Cannot cancel a fully paid invoice. Issue a refund or credit note instead.', 400);
    }

    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    await AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'INVOICE_CANCELLED',
      entityType: 'Invoice',
      entityId: updated.id,
      beforeState: invoice,
      afterState: updated,
    });

    res.json({
      success: true,
      message: 'Invoice cancelled successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// POST /api/v1/invoices/:id/send (Send invoice email to customer) - ADMIN, STAFF
// -------------------------------------------------------------
router.post('/:id/send', requireRole('ADMIN', 'STAFF'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { customer: { include: { user: true } } },
    });

    if (!invoice) throw new AppError('Invoice not found', 404);
    if (!invoice.customer?.user?.email) {
      throw new AppError('Customer email not found', 400);
    }

    await EmailService.sendInvoiceEmail(
      invoice.customer.user.email,
      invoice.invoiceNumber,
      `₹${invoice.totalAmount}`,
      invoice.dueDate.toLocaleDateString(),
      `${config.webAppUrl}/portal/invoices`
    );

    await AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'INVOICE_SENT',
      entityType: 'Invoice',
      entityId: invoice.id,
      afterState: { sentTo: invoice.customer.user.email },
    });

    res.json({
      success: true,
      message: `Invoice email successfully sent to ${invoice.customer.user.email}`,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// GET /api/v1/invoices/:id/pdf (Download PDF Invoice)
// -------------------------------------------------------------
router.get('/:id/pdf', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        customer: { include: { user: true } },
        lines: { include: { product: true, variant: true } },
        taxes: true,
        discounts: true,
      },
    });

    if (!invoice) throw new AppError('Invoice not found', 404);

    if (req.user!.role === 'CUSTOMER' && invoice.customerId !== req.user!.customerId) {
      throw new AppError('Forbidden: Access denied to this invoice', 403);
    }

    const pdfBuffer = await PdfService.generateInvoicePdf(invoice);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Invoice-${invoice.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

export default router;
