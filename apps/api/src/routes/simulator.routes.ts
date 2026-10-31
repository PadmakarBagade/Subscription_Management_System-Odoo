import { Router, Request, Response, NextFunction } from 'express';
import { SimulatorCalculateSchema } from '@brightloop/shared';
import { SimulatorService } from '../services/simulatorService';
import { authenticate } from '../middleware/auth';

const router = Router();

// -------------------------------------------------------------
// POST /api/v1/simulator/calculate
// -------------------------------------------------------------
router.post('/calculate', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = SimulatorCalculateSchema.parse(req.body);

    const result = await SimulatorService.simulateBilling({
      planId: validated.planId,
      billingFrequency: validated.billingFrequency,
      items: validated.items,
      discountCode: validated.discountCode,
      taxRuleIds: validated.taxRuleIds,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
