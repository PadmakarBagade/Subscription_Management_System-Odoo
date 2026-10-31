import { Router, Request, Response, NextFunction } from 'express';
import { QuotationTemplateCreateSchema, QuotationTemplateUpdateSchema } from '@brightloop/shared';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requireRole } from '../middleware/auth';
import { sanitizeDataForRole } from '../utils/serializer';
import { PricingService } from '../services/pricingService';

const router = Router();

router.use(authenticate);

// -------------------------------------------------------------
// GET /api/v1/quotation-templates (List templates) - ADMIN & STAFF
// -------------------------------------------------------------
router.get('/', requireRole('ADMIN', 'STAFF'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const showAll = req.query.all === 'true' && req.user!.role === 'ADMIN';
    const where: any = showAll ? {} : { isActive: true };

    const templates = await prisma.quotationTemplate.findMany({
      where,
      include: {
        defaultPlan: true,
        lines: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const sanitized = sanitizeDataForRole(templates, req.user!.role);

    res.json({
      success: true,
      data: sanitized,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// POST /api/v1/quotation-templates (Create template) - ADMIN ONLY
// -------------------------------------------------------------
router.post('/', requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = QuotationTemplateCreateSchema.parse(req.body);

    if (validated.defaultPlanId) {
      const plan = await prisma.plan.findUnique({
        where: { id: validated.defaultPlanId },
      });
      if (!plan) throw new AppError('Default plan not found', 404);
    }

    const template = await prisma.$transaction(async (tx) => {
      const created = await tx.quotationTemplate.create({
        data: {
          name: validated.name,
          description: validated.description || null,
          defaultPlanId: validated.defaultPlanId || null,
          validityDays: validated.validityDays || 30,
          isActive: validated.isActive ?? true,
        },
      });

      if (validated.lines && validated.lines.length > 0) {
        for (const line of validated.lines) {
          // Calculate unit price if not explicitly supplied
          let unitPrice = line.unitPrice;
          if (unitPrice === undefined || unitPrice === null) {
            const calc = await PricingService.calculateProductLine(
              line.productId,
              line.variantId,
              line.quantity || 1
            );
            unitPrice = calc.finalUnitPrice;
          }

          await tx.quotationTemplateLine.create({
            data: {
              templateId: created.id,
              productId: line.productId,
              variantId: line.variantId || null,
              quantity: line.quantity || 1,
              unitPrice,
            },
          });
        }
      }

      return tx.quotationTemplate.findUnique({
        where: { id: created.id },
        include: {
          defaultPlan: true,
          lines: {
            include: {
              product: true,
              variant: true,
            },
          },
        },
      });
    });

    const sanitized = sanitizeDataForRole(template, req.user!.role);

    res.status(201).json({
      success: true,
      message: 'Quotation template created successfully',
      data: sanitized,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// GET /api/v1/quotation-templates/:id (Get template details) - ADMIN & STAFF
// -------------------------------------------------------------
router.get('/:id', requireRole('ADMIN', 'STAFF'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const template = await prisma.quotationTemplate.findUnique({
      where: { id: req.params.id },
      include: {
        defaultPlan: true,
        lines: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!template) {
      throw new AppError('Quotation template not found', 404);
    }

    const sanitized = sanitizeDataForRole(template, req.user!.role);

    res.json({
      success: true,
      data: sanitized,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// PATCH /api/v1/quotation-templates/:id (Update template) - ADMIN ONLY
// -------------------------------------------------------------
router.patch('/:id', requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = QuotationTemplateUpdateSchema.parse(req.body);

    const existing = await prisma.quotationTemplate.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) throw new AppError('Quotation template not found', 404);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.quotationTemplate.update({
        where: { id: req.params.id },
        data: {
          name: validated.name,
          description: validated.description,
          defaultPlanId: validated.defaultPlanId,
          validityDays: validated.validityDays,
          isActive: validated.isActive,
        },
      });

      if (validated.lines) {
        // Replace lines
        await tx.quotationTemplateLine.deleteMany({
          where: { templateId: req.params.id },
        });

        for (const line of validated.lines) {
          let unitPrice = line.unitPrice;
          if (unitPrice === undefined || unitPrice === null) {
            const calc = await PricingService.calculateProductLine(
              line.productId,
              line.variantId,
              line.quantity || 1
            );
            unitPrice = calc.finalUnitPrice;
          }

          await tx.quotationTemplateLine.create({
            data: {
              templateId: req.params.id,
              productId: line.productId,
              variantId: line.variantId || null,
              quantity: line.quantity || 1,
              unitPrice,
            },
          });
        }
      }

      return tx.quotationTemplate.findUnique({
        where: { id: req.params.id },
        include: {
          defaultPlan: true,
          lines: {
            include: {
              product: true,
              variant: true,
            },
          },
        },
      });
    });

    const sanitized = sanitizeDataForRole(updated, req.user!.role);

    res.json({
      success: true,
      message: 'Quotation template updated successfully',
      data: sanitized,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// DELETE /api/v1/quotation-templates/:id (Delete/Deactivate template) - ADMIN ONLY
// -------------------------------------------------------------
router.delete('/:id', requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.quotationTemplate.findUnique({
      where: { id: req.params.id },
      include: { quotations: { select: { id: true } } },
    });

    if (!existing) throw new AppError('Quotation template not found', 404);

    if (existing.quotations.length > 0) {
      // Soft-delete if quotations reference this template
      await prisma.quotationTemplate.update({
        where: { id: req.params.id },
        data: { isActive: false },
      });
      return res.json({
        success: true,
        message: 'Quotation template has existing quotations and was deactivated.',
      });
    }

    await prisma.quotationTemplate.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Quotation template deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
