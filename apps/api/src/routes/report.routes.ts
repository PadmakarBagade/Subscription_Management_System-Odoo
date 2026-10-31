import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { ReportingService } from '../services/reportingService';

const router = Router();

router.use(authenticate);

// -------------------------------------------------------------
// GET /api/v1/reports/operational (Operational Dashboard - ADMIN & STAFF)
// -------------------------------------------------------------
router.get('/operational', requireRole('ADMIN', 'STAFF'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const operational = await ReportingService.getOperationalMetrics();
    res.json({
      success: true,
      data: operational,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// GET /api/v1/reports/overview (High level KPI Cards - ADMIN only)
// -------------------------------------------------------------
router.get('/overview', requireRole('ADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
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
// GET /api/v1/reports/revenue (Monthly Collections Chart - ADMIN only)
// -------------------------------------------------------------
router.get('/revenue', requireRole('ADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
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
// GET /api/v1/reports/status (Status breakdown - ADMIN only)
// -------------------------------------------------------------
router.get('/status', requireRole('ADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
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
// GET /api/v1/reports/plans (Revenue by Plan - ADMIN only)
// -------------------------------------------------------------
router.get('/plans', requireRole('ADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
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
