import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole, CurrentUser } from '@brightloop/shared';
import { config } from '../config';
import { prisma } from '../utils/prisma';
import { AppError } from './errorHandler';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: CurrentUser;
      requestId?: string;
    }
  }
}

interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  customerId?: string;
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as any,
  });
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    // 1. Check Bearer Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    // 2. Check HTTP-only cookie
    else if (req.cookies?.auth_token) {
      token = req.cookies.auth_token;
    }

    if (!token) {
      return next(new AppError('Authentication required. Please log in.', 401));
    }

    // Verify token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    } catch {
      return next(new AppError('Invalid or expired authentication token.', 401));
    }

    // Check user active status in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { customerProfile: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      return next(new AppError('User account is inactive or not found.', 401));
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      customerId: user.customerProfile?.id,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError('Forbidden: Insufficient privileges to perform this action.', 403)
      );
    }

    next();
  };
}

export const requireAdmin = requireRole('ADMIN');
export const requireStaffOrAdmin = requireRole('ADMIN', 'STAFF');

/**
 * Middleware that grants full access (GET, POST, PATCH, DELETE) to ADMIN,
 * and READ-ONLY access (GET) to STAFF.
 * Returns 403 for Staff write attempts and for unpermitted roles.
 */
export function requireAdminOrReadOnlyForStaff(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new AppError('Authentication required.', 401));
  }

  if (req.user.role === 'ADMIN') {
    return next();
  }

  if (req.user.role === 'STAFF') {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return next();
    }
    return next(
      new AppError('Forbidden: Staff accounts have read-only access to this catalog configuration.', 403)
    );
  }

  return next(new AppError('Forbidden: Insufficient privileges.', 403));
}

export function requireCustomerOwnership(
  getCustomerId: (req: Request) => string | undefined | Promise<string | undefined>
) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    // Admins and Staff bypass ownership checks
    if (req.user.role === 'ADMIN' || req.user.role === 'STAFF') {
      return next();
    }

    // For CUSTOMER, enforce that the resource belongs to their customerId
    const targetCustomerId = await getCustomerId(req);
    if (!targetCustomerId || targetCustomerId !== req.user.customerId) {
      return next(
        new AppError('Forbidden: You can only access your own records.', 403)
      );
    }

    next();
  };
}
