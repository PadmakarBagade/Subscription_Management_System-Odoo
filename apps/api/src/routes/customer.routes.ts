import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { CustomerCreateSchema, CustomerUpdateSchema } from '@brightloop/shared';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requireRole, requireCustomerOwnership } from '../middleware/auth';
import { AuditService } from '../services/auditService';

const router = Router();

// All customer management routes require authentication
router.use(authenticate);

// -------------------------------------------------------------
// GET /api/v1/customers (List customers)
// -------------------------------------------------------------
router.get('/', requireRole('ADMIN', 'STAFF'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const search = (req.query.search as string || '').trim();
    const hasBalance = req.query.hasBalance === 'true';
    const sortBy = (req.query.sortBy as string || 'default');
    const skip = (page - 1) * limit;

    // 1. Calculate overall receivables in system
    const totalReceivablesAgg = await prisma.invoice.aggregate({
      where: {
        status: { notIn: ['CANCELLED', 'VOID', 'PAID'] },
      },
      _sum: { balance: true },
    });
    const totalReceivables = Number(totalReceivablesAgg._sum.balance || 0);

    // 2. Fetch all customers with outstanding invoices
    const allBalances = await prisma.invoice.groupBy({
      by: ['customerId'],
      where: {
        status: { notIn: ['CANCELLED', 'VOID', 'PAID'] },
      },
      _sum: { balance: true },
    });
    const globalBalanceMap = new Map(allBalances.map((b) => [b.customerId, Number(b._sum.balance || 0)]));
    const customerIdsWithBalance = Array.from(globalBalanceMap.keys()).filter(id => (globalBalanceMap.get(id) || 0) > 0);

    const where: any = {};
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (hasBalance) {
      where.id = { in: customerIdsWithBalance };
    }

    // Determine ordering: if sortBy is 'balance' or 'default', prioritize customers with invoices/subscriptions
    let orderBy: any = [{ subscriptions: { _count: 'desc' } }, { createdAt: 'desc' }];
    if (sortBy === 'name') {
      orderBy = [{ user: { name: 'asc' } }];
    } else if (sortBy === 'newest') {
      orderBy = [{ createdAt: 'desc' }];
    }

    const [total, customers] = await Promise.all([
      prisma.customerProfile.count({ where }),
      prisma.customerProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: { select: { id: true, name: true, email: true, status: true, lastLoginAt: true } },
          _count: {
            select: {
              subscriptions: true,
              invoices: true,
              payments: true,
            },
          },
        },
      }),
    ]);

    const enrichedCustomers = customers.map((c) => ({
      ...c,
      outstandingBalance: globalBalanceMap.get(c.id) || 0,
    }));

    // If sorting by balance, sort the current page slice or provide sorted list
    if (sortBy === 'balance' || sortBy === 'default') {
      enrichedCustomers.sort((a, b) => b.outstandingBalance - a.outstandingBalance);
    }

    res.json({
      success: true,
      data: enrichedCustomers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalReceivables,
        customersWithBalanceCount: customerIdsWithBalance.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// POST /api/v1/customers (Create customer)
// -------------------------------------------------------------
router.post('/', requireRole('ADMIN', 'STAFF'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = CustomerCreateSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { email: validated.email },
    });
    if (existing) {
      throw new AppError('A user with this email already exists', 409);
    }

    // Default or specified password
    const rawPassword = validated.password || 'Customer@Brightloop2026!';
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    const customer = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: validated.name,
          email: validated.email,
          passwordHash,
          role: 'CUSTOMER',
          status: 'ACTIVE',
        },
      });

      return tx.customerProfile.create({
        data: {
          userId: user.id,
          companyName: validated.companyName || null,
          phone: validated.phone || null,
          billingAddress: validated.billingAddress || null,
          shippingAddress: validated.shippingAddress || null,
          taxId: validated.taxId || null,
          currency: validated.currency || 'INR',
          notes: validated.notes || null,
        },
        include: { user: true },
      });
    });

    await AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'CUSTOMER_CREATED',
      entityType: 'CustomerProfile',
      entityId: customer.id,
      afterState: customer,
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// GET /api/v1/customers/:id (Customer details)
// -------------------------------------------------------------
router.get(
  '/:id',
  requireCustomerOwnership((req) => req.params.id),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customer = await prisma.customerProfile.findUnique({
        where: { id: req.params.id },
        include: {
          user: { select: { id: true, name: true, email: true, status: true, lastLoginAt: true } },
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            include: { plan: true },
          },
          invoices: {
            orderBy: { invoiceDate: 'desc' },
          },
          payments: {
            orderBy: { paymentDate: 'desc' },
          },
        },
      });

      if (!customer) {
        throw new AppError('Customer profile not found', 404);
      }

      // Calculate customer's outstanding balance
      const invSum = await prisma.invoice.aggregate({
        where: {
          customerId: customer.id,
          status: { notIn: ['CANCELLED', 'VOID', 'PAID'] },
        },
        _sum: { balance: true },
      });
      const outstandingBalance = Number(invSum._sum.balance || 0);

      res.json({
        success: true,
        data: {
          ...customer,
          outstandingBalance,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// -------------------------------------------------------------
// PATCH /api/v1/customers/:id (Update customer)
// -------------------------------------------------------------
router.patch(
  '/:id',
  requireCustomerOwnership((req) => req.params.id),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = CustomerUpdateSchema.parse(req.body);

      const existing = await prisma.customerProfile.findUnique({
        where: { id: req.params.id },
        include: { user: true },
      });

      if (!existing) {
        throw new AppError('Customer not found', 404);
      }

      const updated = await prisma.$transaction(async (tx) => {
        if (validated.name && validated.name !== existing.user.name) {
          await tx.user.update({
            where: { id: existing.userId },
            data: { name: validated.name },
          });
        }

        return tx.customerProfile.update({
          where: { id: req.params.id },
          data: {
            companyName: validated.companyName !== undefined ? validated.companyName : existing.companyName,
            phone: validated.phone !== undefined ? validated.phone : existing.phone,
            billingAddress: validated.billingAddress !== undefined ? validated.billingAddress : existing.billingAddress,
            shippingAddress: validated.shippingAddress !== undefined ? validated.shippingAddress : existing.shippingAddress,
            taxId: validated.taxId !== undefined ? validated.taxId : existing.taxId,
            currency: validated.currency || existing.currency,
            notes: validated.notes !== undefined ? validated.notes : existing.notes,
          },
          include: { user: true },
        });
      });

      await AuditService.log({
        userId: req.user!.id,
        userEmail: req.user!.email,
        action: 'CUSTOMER_UPDATED',
        entityType: 'CustomerProfile',
        entityId: updated.id,
        beforeState: existing,
        afterState: updated,
      });

      res.json({
        success: true,
        message: 'Customer profile updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
