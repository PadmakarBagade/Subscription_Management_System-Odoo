import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { RegisterSchema, LoginSchema, ForgotPasswordSchema, ResetPasswordSchema } from '@brightloop/shared';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, generateToken } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { EmailService } from '../services/emailService';
import { config } from '../config';

const router = Router();

// Rate limit authentication attempts (e.g. 15 requests per 15 minutes)
const authLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });

// -------------------------------------------------------------
// POST /api/v1/auth/register
// -------------------------------------------------------------
router.post('/register', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = RegisterSchema.parse(req.body);

    // Check unique email
    const existing = await prisma.user.findUnique({
      where: { email: validated.email },
    });
    if (existing) {
      throw new AppError('An account with this email address already exists.', 409);
    }

    // Hash password with 12 bcrypt salt rounds
    const passwordHash = await bcrypt.hash(validated.password, 12);

    // Create user and associated CustomerProfile transactionally
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: validated.email,
          passwordHash,
          name: validated.name,
          role: 'CUSTOMER',
          status: 'ACTIVE',
        },
      });

      const customerProfile = await tx.customerProfile.create({
        data: {
          userId: newUser.id,
          companyName: validated.companyName || null,
          phone: validated.phone || null,
        },
      });

      return { ...newUser, customerProfile };
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      customerId: user.customerProfile.id,
    });

    // Set HTTP-only secure cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Send welcome email asynchronously
    EmailService.sendWelcomeEmail(user.email, user.name).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          customerId: user.customerProfile.id,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// POST /api/v1/auth/login
// -------------------------------------------------------------
router.post('/login', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = LoginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: validated.email },
      include: { customerProfile: true, staffProfile: true },
    });

    // Constant-time check: even if user not found, perform dummy hash to mitigate timing attacks
    if (!user) {
      await bcrypt.hash('dummy_password_for_timing', 12);
      throw new AppError('Invalid email or password', 401);
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError('Your account has been deactivated or suspended.', 403);
    }

    const isMatch = await bcrypt.compare(validated.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      customerId: user.customerProfile?.id,
    });

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          customerId: user.customerProfile?.id,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// POST /api/v1/auth/logout
// -------------------------------------------------------------
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'lax',
  });

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

// -------------------------------------------------------------
// POST /api/v1/auth/forgot-password
// -------------------------------------------------------------
router.post('/forgot-password', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = ForgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    // Always respond with success to prevent user email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If that email address is registered, password reset instructions have been sent.',
      });
    }

    // Generate cryptographically secure token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + config.passwordReset.expiresMinutes * 60 * 1000);

    // Save token
    await prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    // Dispatch email
    await EmailService.sendPasswordResetEmail(user.email, rawToken);

    res.json({
      success: true,
      message: 'If that email address is registered, password reset instructions have been sent.',
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// POST /api/v1/auth/reset-password
// -------------------------------------------------------------
router.post('/reset-password', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = ResetPasswordSchema.parse(req.body);

    const tokenHash = crypto.createHash('sha256').update(validated.token).digest('hex');

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetToken || resetToken.usedAt !== null || resetToken.expiresAt < new Date()) {
      throw new AppError('Password reset link is invalid or has expired.', 400);
    }

    const newPasswordHash = await bcrypt.hash(validated.password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: newPasswordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    res.json({
      success: true,
      message: 'Your password has been reset successfully. You may now log in.',
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// GET /api/v1/auth/me
// -------------------------------------------------------------
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        customerProfile: true,
        staffProfile: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          customerProfile: user.customerProfile,
          staffProfile: user.staffProfile,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
