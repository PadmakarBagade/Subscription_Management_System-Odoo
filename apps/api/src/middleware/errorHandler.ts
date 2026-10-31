import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { config } from '../config';

export class AppError extends Error {
  public statusCode: number;
  public errors?: Record<string, string[]>;

  constructor(message: string, statusCode: number = 400, errors?: Record<string, string[]>) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Handle Zod validation errors (robust across monorepo package boundaries)
  if (err instanceof ZodError || err.name === 'ZodError' || Array.isArray(err.issues)) {
    const formattedErrors: Record<string, string[]> = {};
    const issues = err.issues || [];
    for (const issue of issues) {
      const path = Array.isArray(issue.path) ? issue.path.join('.') || 'general' : 'general';
      if (!formattedErrors[path]) {
        formattedErrors[path] = [];
      }
      formattedErrors[path].push(issue.message);
    }

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors: formattedErrors,
    });
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.errors ? { errors: err.errors } : {}),
    });
  }

  // Handle Prisma unique constraint violation (P2002)
  if (err.code === 'P2002') {
    const targets = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'field';
    return res.status(409).json({
      success: false,
      error: `A record with this ${targets} already exists.`,
    });
  }

  // Handle Prisma record not found (P2025)
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: 'Requested record was not found.',
    });
  }

  // Generic internal server error
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled Exception');

  return res.status(500).json({
    success: false,
    error: config.env === 'production' ? 'Internal server error' : err.message || 'Internal server error',
  });
}
