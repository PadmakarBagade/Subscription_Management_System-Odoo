import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

/**
 * Basic in-memory rate limiter per IP address
 */
export function rateLimiter({
  windowMs = 15 * 60 * 1000, // 15 minutes
  max = 100, // 100 requests per window
  message = 'Too many requests from this IP, please try again later.',
} = {}) {
  return (req: Request, _res: Response, next: NextFunction) => {
    // In test environment, skip rate limiting to avoid test interference
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const key = `${req.baseUrl || req.path}:${ip}`;
    const now = Date.now();

    const record = memoryStore.get(key);

    if (!record || now > record.resetTime) {
      memoryStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    record.count += 1;

    if (record.count > max) {
      return next(new AppError(message, 429));
    }

    next();
  };
}
