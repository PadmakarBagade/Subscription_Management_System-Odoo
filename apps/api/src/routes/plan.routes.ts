import { Router, Request, Response, NextFunction } from 'express';
import { PlanCreateSchema, PlanUpdateSchema } from '@brightloop/shared';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requireRole } from '../middleware/auth';
import { AuditService } from '../services/auditService';
import { sanitizeDataForRole } from '../utils/serializer';

const router = Router();

// Catalog plans access restricted to ADMIN and STAFF (Customer: NONE)
router.use(authenticate, requireRole('ADMIN', 'STAFF'));

// -------------------------------------------------------------
// GET /api/v1/plans (List plans)
// -------------------------------------------------------------
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';

    const plans = await prisma.plan.findMany({
      where: includeInactive ? undefined : { isActive: true },
      include: {
        planProducts: {
          include: {
            product: {
              include: { variants: true },
            },
          },
        },
      },
      orderBy: { basePrice: 'asc' },
    });

    res.json({
      success: true,
      data: sanitizeDataForRole(plans, req.user?.role),
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// POST /api/v1/plans (Create plan) - ADMIN only
// -------------------------------------------------------------
router.post('/', requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = PlanCreateSchema.parse(req.body);

    const plan = await prisma.$transaction(async (tx) => {
      const newPlan = await tx.plan.create({
        data: {
          name: validated.name,
          code: validated.code,
          description: validated.description || null,
          billingFrequency: validated.billingFrequency,
          basePrice: validated.basePrice,
          minimumQuantity: validated.minimumQuantity,
          availabilityStart: validated.availabilityStart || null,
          availabilityEnd: validated.availabilityEnd || null,
          isActive: validated.isActive,
          autoClosePolicy: validated.autoClosePolicy,
          allowEarlyClosure: validated.allowEarlyClosure,
          allowPause: validated.allowPause,
          allowRenewal: validated.allowRenewal,
        },
      });

      if (validated.productIds && validated.productIds.length > 0) {
        await tx.planProduct.createMany({
          data: validated.productIds.map((p) => ({
            planId: newPlan.id,
            productId: p.productId,
            defaultQuantity: p.defaultQuantity,
            isRequired: p.isRequired,
          })),
        });
      }

      return tx.plan.findUnique({
        where: { id: newPlan.id },
        include: {
          planProducts: { include: { product: true } },
        },
      });
    });

    await AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'PLAN_CREATED',
      entityType: 'Plan',
      entityId: plan!.id,
      afterState: plan,
    });

    res.status(201).json({
      success: true,
      message: 'Subscription plan created successfully',
      data: plan,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// GET /api/v1/plans/:id (Plan details)
// -------------------------------------------------------------
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plan = await prisma.plan.findUnique({
      where: { id: req.params.id },
      include: {
        planProducts: {
          include: {
            product: { include: { variants: true } },
          },
        },
      },
    });

    if (!plan) {
      throw new AppError('Subscription plan not found', 404);
    }

    res.json({
      success: true,
      data: sanitizeDataForRole(plan, req.user?.role),
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// PATCH /api/v1/plans/:id (Update plan) - ADMIN only
// -------------------------------------------------------------
router.patch('/:id', requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = PlanUpdateSchema.parse(req.body);

    const existing = await prisma.plan.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new AppError('Plan not found', 404);
    }

    const updated = await prisma.plan.update({
      where: { id: req.params.id },
      data: {
        name: validated.name !== undefined ? validated.name : existing.name,
        code: validated.code !== undefined ? validated.code : existing.code,
        description: validated.description !== undefined ? validated.description : existing.description,
        billingFrequency: validated.billingFrequency || existing.billingFrequency,
        basePrice: validated.basePrice !== undefined ? validated.basePrice : existing.basePrice,
        minimumQuantity: validated.minimumQuantity !== undefined ? validated.minimumQuantity : existing.minimumQuantity,
        availabilityStart: validated.availabilityStart !== undefined ? validated.availabilityStart : existing.availabilityStart,
        availabilityEnd: validated.availabilityEnd !== undefined ? validated.availabilityEnd : existing.availabilityEnd,
        isActive: validated.isActive !== undefined ? validated.isActive : existing.isActive,
        autoClosePolicy: validated.autoClosePolicy !== undefined ? validated.autoClosePolicy : existing.autoClosePolicy,
        allowEarlyClosure: validated.allowEarlyClosure !== undefined ? validated.allowEarlyClosure : existing.allowEarlyClosure,
        allowPause: validated.allowPause !== undefined ? validated.allowPause : existing.allowPause,
        allowRenewal: validated.allowRenewal !== undefined ? validated.allowRenewal : existing.allowRenewal,
      },
      include: {
        planProducts: { include: { product: true } },
      },
    });

    await AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'PLAN_UPDATED',
      entityType: 'Plan',
      entityId: updated.id,
      beforeState: existing,
      afterState: updated,
    });

    res.json({
      success: true,
      message: 'Subscription plan updated successfully',
      data: sanitizeDataForRole(updated, req.user?.role),
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// DELETE /api/v1/plans/:id (Deactivate plan) - ADMIN only
// -------------------------------------------------------------
router.delete('/:id', requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.plan.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new AppError('Plan not found', 404);
    }

    const deactivated = await prisma.plan.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    await AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'PLAN_DEACTIVATED',
      entityType: 'Plan',
      entityId: deactivated.id,
    });

    res.json({
      success: true,
      message: 'Subscription plan deactivated successfully',
      data: deactivated,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
