import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { AiAssistantService } from '../services/aiAssistantService';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate, requireRole('ADMIN', 'STAFF'));

// -------------------------------------------------------------
// POST /api/v1/ai/query (Natural Language Financial Assistant)
// -------------------------------------------------------------
router.post('/query', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const question = (req.body.question as string || '').trim();
    if (!question) {
      throw new AppError('Question is required', 400);
    }

    const result = await AiAssistantService.queryRevenueMetrics(question);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
