import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export interface CalculatedLine {
  productId: string;
  productName: string;
  variantId?: string | null;
  variantName?: string | null;
  quantity: number;
  baseUnitPrice: number;
  variantAdjustment: number;
  finalUnitPrice: number;
  lineSubtotal: number;
}

export class PricingService {
  /**
   * Authoritatively calculates the unit price and subtotal for a product line
   * including base price and any selected product variant adjustments.
   * Never trusts prices submitted by client applications.
   */
  static async calculateProductLine(
    productId: string,
    variantId?: string | null,
    quantity: number = 1
  ): Promise<CalculatedLine> {
    if (quantity < 1) {
      throw new AppError('Quantity must be at least 1', 400);
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { variants: true },
    });

    if (!product) {
      throw new AppError(`Product with ID ${productId} not found`, 404);
    }

    if (!product.isActive) {
      throw new AppError(`Product ${product.name} is currently inactive`, 400);
    }

    const baseUnitPrice = Number(product.salesPrice);
    let variantAdjustment = 0;
    let variantName: string | null = null;

    if (variantId) {
      const variant = product.variants.find((v) => v.id === variantId);
      if (!variant) {
        throw new AppError(`Selected variant not found on product ${product.name}`, 404);
      }
      if (!variant.isActive) {
        throw new AppError(`Variant ${variant.name}: ${variant.value} is inactive`, 400);
      }

      variantAdjustment = Number(variant.priceAdjustment);
      variantName = `${variant.name}: ${variant.value}`;
    }

    const finalUnitPrice = Math.max(0, baseUnitPrice + variantAdjustment);
    const lineSubtotal = Number((finalUnitPrice * quantity).toFixed(2));

    return {
      productId: product.id,
      productName: product.name,
      variantId: variantId || null,
      variantName,
      quantity,
      baseUnitPrice,
      variantAdjustment,
      finalUnitPrice,
      lineSubtotal,
    };
  }
}
