import { Router, Request, Response, NextFunction } from 'express';
import { TaxRuleCreateSchema } from '@brightloop/shared';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requireRole } from '../middleware/auth';
import { AuditService } from '../services/auditService';

const router = Router();

// Tax rules are restricted to ADMIN and STAFF (Customer: NONE)
router.use(authenticate, requireRole('ADMIN', 'STAFF'));

// -------------------------------------------------------------
// GET /api/v1/taxes (List tax rules)
// -------------------------------------------------------------
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rules = await prisma.taxRule.findMany({
      orderBy: { priority: 'asc' },
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
// POST /api/v1/taxes (Create tax rule) - ADMIN only
// -------------------------------------------------------------
router.post('/', requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = TaxRuleCreateSchema.parse(req.body);

    const rule = await prisma.taxRule.create({
      data: {
        name: validated.name,
        code: validated.code,
        taxType: validated.taxType,
        rate: validated.rate,
        isGst: validated.isGst,
        cgstRate: validated.cgstRate || null,
        sgstRate: validated.sgstRate || null,
        igstRate: validated.igstRate || null,
        effectiveFrom: validated.effectiveFrom || null,
        effectiveTo: validated.effectiveTo || null,
        isActive: validated.isActive,
        priority: validated.priority,
      },
    });

    await AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'TAX_RULE_CREATED',
      entityType: 'TaxRule',
      entityId: rule.id,
      afterState: rule,
    });

    res.status(201).json({
      success: true,
      message: 'Tax rule created successfully',
      data: rule,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// PATCH /api/v1/taxes/:id (Update tax rule) - ADMIN only
// -------------------------------------------------------------
router.patch('/:id', requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.taxRule.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) throw new AppError('Tax rule not found', 404);

    const updated = await prisma.taxRule.update({
      where: { id: req.params.id },
      data: req.body,
    });

    await AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'TAX_RULE_UPDATED',
      entityType: 'TaxRule',
      entityId: updated.id,
      beforeState: existing,
      afterState: updated,
    });

    res.json({
      success: true,
      message: 'Tax rule updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// DELETE /api/v1/taxes/:id (Deactivate tax rule) - ADMIN only
// -------------------------------------------------------------
router.delete('/:id', requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.taxRule.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) throw new AppError('Tax rule not found', 404);

    const deactivated = await prisma.taxRule.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    await AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'TAX_RULE_DEACTIVATED',
      entityType: 'TaxRule',
      entityId: deactivated.id,
    });

    res.json({
      success: true,
      message: 'Tax rule deactivated successfully',
      data: deactivated,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
