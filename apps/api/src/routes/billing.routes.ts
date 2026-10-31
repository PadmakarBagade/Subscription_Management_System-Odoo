import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { BillingEngine } from '../services/billingEngine';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate, requireRole('ADMIN'));

// -------------------------------------------------------------
// POST /api/v1/billing/trigger (Manually trigger billing run)
// -------------------------------------------------------------
router.post('/trigger', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const executedBy = req.user ? `${req.user.name} (${req.user.email})` : 'ADMIN_MANUAL';
    const result = await BillingEngine.executeBillingRun(executedBy);

    res.json({
      success: true,
      message: `Billing run ${result.runNumber} completed with status: ${result.status}`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// GET /api/v1/billing/runs (List billing runs)
// -------------------------------------------------------------
router.get('/runs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const runs = await prisma.billingRun.findMany({
      orderBy: { startTime: 'desc' },
      take: 50,
      include: {
        _count: { select: { items: true } },
      },
    });

    res.json({
      success: true,
      data: runs,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// GET /api/v1/billing/runs/:id (Billing run detail with items)
// -------------------------------------------------------------
router.get('/runs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const run = await prisma.billingRun.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: {
            subscription: {
              include: {
                customer: { include: { user: { select: { name: true, email: true } } } },
                plan: true,
              },
            },
            invoice: { select: { invoiceNumber: true, totalAmount: true } },
          },
        },
      },
    });

    if (!run) throw new AppError('Billing run not found', 404);

    res.json({
      success: true,
      data: run,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
