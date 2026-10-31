import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { ReportingService } from '../services/reportingService';

const router = Router();

router.use(authenticate, requireRole('ADMIN', 'STAFF'));

// -------------------------------------------------------------
// GET /api/v1/reports/overview (High level KPI Cards)
// -------------------------------------------------------------
router.get('/overview', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const metrics = await ReportingService.getOverviewMetrics();
    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// GET /api/v1/reports/revenue (Monthly Collections Chart)
// -------------------------------------------------------------
router.get('/revenue', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const collections = await ReportingService.getMonthlyCollections();
    res.json({
      success: true,
      data: collections,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// GET /api/v1/reports/status (Status breakdown)
// -------------------------------------------------------------
router.get('/status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const distribution = await ReportingService.getStatusDistribution();
    res.json({
      success: true,
      data: distribution,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// GET /api/v1/reports/plans (Revenue by Plan)
// -------------------------------------------------------------
router.get('/plans', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const planRevenue = await ReportingService.getRevenueByPlan();
    res.json({
      success: true,
      data: planRevenue,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
