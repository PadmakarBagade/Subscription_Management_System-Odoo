import { Router, Request, Response, NextFunction } from 'express';
import { DiscountRuleCreateSchema } from '@brightloop/shared';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requireRole } from '../middleware/auth';
import { AuditService } from '../services/auditService';

const router = Router();

// Discount rules restricted to ADMIN and STAFF (Customer: NONE)
router.use(authenticate, requireRole('ADMIN', 'STAFF'));

// -------------------------------------------------------------
// GET /api/v1/discounts (List discount rules)
// -------------------------------------------------------------
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rules = await prisma.discountRule.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { usages: true } },
      },
    });

    res.json({
      success: true,
      data: rules,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// POST /api/v1/discounts (Create discount rule) - ADMIN only
// -------------------------------------------------------------
router.post('/', requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = DiscountRuleCreateSchema.parse(req.body);

    const existing = await prisma.discountRule.findUnique({
      where: { code: validated.code },
    });
    if (existing) {
      throw new AppError(`A discount rule with code "${validated.code}" already exists`, 409);
    }

    const rule = await prisma.discountRule.create({
      data: {
        name: validated.name,
        code: validated.code,
        discountType: validated.discountType,
        value: validated.value,
        minPurchaseAmount: validated.minPurchaseAmount || null,
        minQuantity: validated.minQuantity || null,
        startDate: validated.startDate || null,
        endDate: validated.endDate || null,
        usageLimit: validated.usageLimit || null,
        isActive: validated.isActive,
        applicableProductIds: validated.applicableProductIds ? validated.applicableProductIds : undefined,
      },
    });

    await AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'DISCOUNT_RULE_CREATED',
      entityType: 'DiscountRule',
      entityId: rule.id,
      afterState: rule,
    });

    res.status(201).json({
      success: true,
      message: 'Discount rule created successfully',
      data: rule,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// PATCH /api/v1/discounts/:id (Update discount rule) - ADMIN only
// -------------------------------------------------------------
router.patch('/:id', requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.discountRule.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) throw new AppError('Discount rule not found', 404);

    const updated = await prisma.discountRule.update({
      where: { id: req.params.id },
      data: req.body,
    });

    await AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'DISCOUNT_RULE_UPDATED',
      entityType: 'DiscountRule',
      entityId: updated.id,
      beforeState: existing,
      afterState: updated,
    });

    res.json({
      success: true,
      message: 'Discount rule updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// DELETE /api/v1/discounts/:id (Deactivate discount rule) - ADMIN only
// -------------------------------------------------------------
router.delete('/:id', requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.discountRule.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) throw new AppError('Discount rule not found', 404);

    const deactivated = await prisma.discountRule.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    await AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'DISCOUNT_RULE_DEACTIVATED',
      entityType: 'DiscountRule',
      entityId: deactivated.id,
    });

    res.json({
      success: true,
      message: 'Discount rule deactivated successfully',
      data: deactivated,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
