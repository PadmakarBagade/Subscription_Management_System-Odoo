import { Router, Request, Response, NextFunction } from 'express';
import { ProductCreateSchema, ProductUpdateSchema } from '@brightloop/shared';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requireRole } from '../middleware/auth';
import { AuditService } from '../services/auditService';
import { sanitizeDataForRole } from '../utils/serializer';

const router = Router();

// Catalog products access restricted to ADMIN and STAFF only (Customer: NONE)
router.use(authenticate, requireRole('ADMIN', 'STAFF'));

// -------------------------------------------------------------
// GET /api/v1/products (List products with variants)
// -------------------------------------------------------------
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';

    const products = await prisma.product.findMany({
      where: includeInactive ? undefined : { isActive: true },
      include: {
        variants: {
          where: includeInactive ? undefined : { isActive: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: sanitizeDataForRole(products, req.user?.role),
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// POST /api/v1/products (Create product) - ADMIN only
// -------------------------------------------------------------
router.post('/', requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = ProductCreateSchema.parse(req.body);

    const product = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          name: validated.name,
          code: validated.code,
          type: validated.type,
          salesPrice: validated.salesPrice,
          costPrice: validated.costPrice,
          notes: validated.notes || null,
          isActive: validated.isActive,
        },
      });

      if (validated.variants && validated.variants.length > 0) {
        await tx.productVariant.createMany({
          data: validated.variants.map((v) => ({
            productId: newProduct.id,
            name: v.name,
            value: v.value,
            priceAdjustment: v.priceAdjustment,
            isActive: v.isActive,
          })),
        });
      }

      return tx.product.findUnique({
        where: { id: newProduct.id },
        include: { variants: true },
      });
    });

    await AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'PRODUCT_CREATED',
      entityType: 'Product',
      entityId: product!.id,
      afterState: product,
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// GET /api/v1/products/:id (Product details)
// -------------------------------------------------------------
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { variants: true },
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    res.json({
      success: true,
      data: sanitizeDataForRole(product, req.user?.role),
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// PATCH /api/v1/products/:id (Update product) - ADMIN only
// -------------------------------------------------------------
router.patch('/:id', requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = ProductUpdateSchema.parse(req.body);

    const existing = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { variants: true },
    });

    if (!existing) {
      throw new AppError('Product not found', 404);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id: req.params.id },
        data: {
          name: validated.name !== undefined ? validated.name : existing.name,
          code: validated.code !== undefined ? validated.code : existing.code,
          type: validated.type !== undefined ? validated.type : existing.type,
          salesPrice: validated.salesPrice !== undefined ? validated.salesPrice : existing.salesPrice,
          costPrice: validated.costPrice !== undefined ? validated.costPrice : existing.costPrice,
          notes: validated.notes !== undefined ? validated.notes : existing.notes,
          isActive: validated.isActive !== undefined ? validated.isActive : existing.isActive,
        },
      });

      // Handle variants update if supplied
      if (validated.variants) {
        // Upsert or sync variants
        for (const v of validated.variants) {
          if (v.id) {
            await tx.productVariant.update({
              where: { id: v.id },
              data: {
                name: v.name,
                value: v.value,
                priceAdjustment: v.priceAdjustment,
                isActive: v.isActive,
              },
            });
          } else {
            await tx.productVariant.create({
              data: {
                productId: p.id,
                name: v.name,
                value: v.value,
                priceAdjustment: v.priceAdjustment,
                isActive: v.isActive,
              },
            });
          }
        }
      }

      return tx.product.findUnique({
        where: { id: p.id },
        include: { variants: true },
      });
    });

    await AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'PRODUCT_UPDATED',
      entityType: 'Product',
      entityId: updated!.id,
      beforeState: existing,
      afterState: updated,
    });

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// DELETE /api/v1/products/:id (Deactivate product) - ADMIN only
// -------------------------------------------------------------
router.delete('/:id', requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.product.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new AppError('Product not found', 404);
    }

    // Soft deactivate to preserve referential integrity for historic subscriptions/invoices
    const deactivated = await prisma.product.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    await AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'PRODUCT_DEACTIVATED',
      entityType: 'Product',
      entityId: deactivated.id,
    });

    res.json({
      success: true,
      message: 'Product deactivated successfully',
      data: deactivated,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
