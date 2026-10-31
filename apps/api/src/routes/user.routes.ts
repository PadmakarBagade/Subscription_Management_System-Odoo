import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requireRole } from '../middleware/auth';
import { AuditService } from '../services/auditService';

const router = Router();

// User management is strictly ADMIN only
router.use(authenticate, requireRole('ADMIN'));

const UserCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email address required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['ADMIN', 'STAFF', 'CUSTOMER']),
  department: z.string().optional(),
  designation: z.string().optional(),
});

const UserUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(['ADMIN', 'STAFF', 'CUSTOMER']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  password: z.string().min(8).optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
});

// -------------------------------------------------------------
// GET /api/v1/users (List accounts)
// -------------------------------------------------------------
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const role = req.query.role as string;
    const search = (req.query.search as string || '').trim();
    const skip = (page - 1) * limit;

    const where: any = {};
    if (role && ['ADMIN', 'STAFF', 'CUSTOMER'].includes(role)) {
      where.role = role;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          staffProfile: true,
          customerProfile: {
            select: {
              id: true,
              companyName: true,
              phone: true,
            },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// POST /api/v1/users (Create staff or admin account)
// -------------------------------------------------------------
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = UserCreateSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new AppError('An account with this email address already exists', 409);
    }

    const passwordHash = await bcrypt.hash(validated.password, 12);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: validated.name,
          email: validated.email.toLowerCase().trim(),
          passwordHash,
          role: validated.role,
          status: 'ACTIVE',
        },
      });

      if (validated.role === 'STAFF') {
        await tx.staffProfile.create({
          data: {
            userId: newUser.id,
            department: validated.department || 'Operations',
            designation: validated.designation || 'Staff Associate',
          },
        });
      }

      return tx.user.findUnique({
        where: { id: newUser.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          staffProfile: true,
        },
      });
    });

    await AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'USER_ACCOUNT_CREATED',
      entityType: 'User',
      entityId: user!.id,
      afterState: user,
    });

    res.status(201).json({
      success: true,
      message: `${validated.role} account created successfully`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// GET /api/v1/users/:id (User details)
// -------------------------------------------------------------
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        staffProfile: true,
        customerProfile: true,
      },
    });

    if (!user) {
      throw new AppError('User account not found', 404);
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// PATCH /api/v1/users/:id (Update user role / status)
// -------------------------------------------------------------
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = UserUpdateSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { staffProfile: true },
    });

    if (!existing) {
      throw new AppError('User account not found', 404);
    }

    // Safety: prevent demoting or deactivating the last active Admin
    if (existing.role === 'ADMIN' && (validated.role !== undefined && validated.role !== 'ADMIN' || validated.status === 'INACTIVE' || validated.status === 'SUSPENDED')) {
      const activeAdminCount = await prisma.user.count({
        where: { role: 'ADMIN', status: 'ACTIVE' },
      });
      if (activeAdminCount <= 1) {
        throw new AppError('Cannot demote or deactivate the sole active Administrator account.', 400);
      }
    }

    let passwordHash: string | undefined;
    if (validated.password) {
      passwordHash = await bcrypt.hash(validated.password, 12);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: req.params.id },
        data: {
          name: validated.name !== undefined ? validated.name : existing.name,
          role: validated.role !== undefined ? validated.role : existing.role,
          status: validated.status !== undefined ? validated.status : existing.status,
          passwordHash: passwordHash !== undefined ? passwordHash : existing.passwordHash,
        },
      });

      if (validated.department !== undefined || validated.designation !== undefined) {
        await tx.staffProfile.upsert({
          where: { userId: u.id },
          create: {
            userId: u.id,
            department: validated.department || 'Operations',
            designation: validated.designation || 'Staff Associate',
          },
          update: {
            department: validated.department,
            designation: validated.designation,
          },
        });
      }

      return tx.user.findUnique({
        where: { id: u.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          staffProfile: true,
          updatedAt: true,
        },
      });
    });

    await AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'USER_ACCOUNT_UPDATED',
      entityType: 'User',
      entityId: updated!.id,
      beforeState: existing,
      afterState: updated,
    });

    res.json({
      success: true,
      message: 'User account updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// DELETE /api/v1/users/:id (Deactivate user)
// -------------------------------------------------------------
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.user.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new AppError('User account not found', 404);
    }

    if (existing.id === req.user!.id) {
      throw new AppError('You cannot deactivate your own account.', 400);
    }

    if (existing.role === 'ADMIN') {
      const activeAdminCount = await prisma.user.count({
        where: { role: 'ADMIN', status: 'ACTIVE' },
      });
      if (activeAdminCount <= 1) {
        throw new AppError('Cannot deactivate the sole active Administrator account.', 400);
      }
    }

    const deactivated = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: 'INACTIVE' },
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    await AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'USER_ACCOUNT_DEACTIVATED',
      entityType: 'User',
      entityId: deactivated.id,
    });

    res.json({
      success: true,
      message: 'User account deactivated successfully',
      data: deactivated,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
