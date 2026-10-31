import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { AlertService } from '../services/alertService';

const router = Router();

router.use(authenticate, requireRole('ADMIN', 'STAFF'));

// -------------------------------------------------------------
// GET /api/v1/alerts (List alerts)
// -------------------------------------------------------------
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const unreviewedOnly = req.query.unreviewedOnly === 'true';
    const alerts = await AlertService.getAlerts(unreviewedOnly);

    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// PATCH /api/v1/alerts/:id/review (Mark alert reviewed)
// -------------------------------------------------------------
router.patch('/:id/review', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviewedBy = req.user!.name || req.user!.email;
    const updated = await AlertService.reviewAlert(req.params.id, reviewedBy);

    res.json({
      success: true,
      message: 'Alert marked as reviewed',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
