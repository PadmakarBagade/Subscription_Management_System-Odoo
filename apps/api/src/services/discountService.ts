import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export interface EvaluatedDiscount {
  discountRuleId: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  value: number;
  discountAmount: number;
}

export class DiscountService {
  /**
   * Evaluates an optional discount code against line items and subtotal.
   * Returns evaluated discount details or null if no code provided.
   */
  static async evaluateDiscount(
    discountCode?: string | null,
    subtotal: number = 0,
    totalQuantity: number = 1,
    productIds: string[] = []
  ): Promise<EvaluatedDiscount | null> {
    if (!discountCode || discountCode.trim() === '') {
      return null;
    }

    const cleanCode = discountCode.trim().toUpperCase();

    const discount = await prisma.discountRule.findUnique({
      where: { code: cleanCode },
    });

    if (!discount) {
      throw new AppError(`Discount code "${cleanCode}" is invalid`, 404);
    }

    if (!discount.isActive) {
      throw new AppError(`Discount code "${cleanCode}" is no longer active`, 400);
    }

    const now = new Date();

    if (discount.startDate && now < discount.startDate) {
      throw new AppError(`Discount code "${cleanCode}" is not yet active`, 400);
    }

    if (discount.endDate && now > discount.endDate) {
      throw new AppError(`Discount code "${cleanCode}" has expired`, 400);
    }

    if (discount.usageLimit !== null && discount.usageCount >= discount.usageLimit) {
      throw new AppError(`Discount code "${cleanCode}" has reached its maximum usage limit`, 400);
    }

    if (discount.minPurchaseAmount && subtotal < Number(discount.minPurchaseAmount)) {
      throw new AppError(
        `Minimum purchase amount of ₹${discount.minPurchaseAmount} required for discount "${cleanCode}"`,
        400
      );
    }

    if (discount.minQuantity && totalQuantity < discount.minQuantity) {
      throw new AppError(
        `Minimum quantity of ${discount.minQuantity} items required for discount "${cleanCode}"`,
        400
      );
    }

    // Check applicable products if restricted
    if (discount.applicableProductIds && Array.isArray(discount.applicableProductIds) && discount.applicableProductIds.length > 0) {
      const applicableList = discount.applicableProductIds as string[];
      const hasEligibleProduct = productIds.some((id) => applicableList.includes(id));
      if (!hasEligibleProduct) {
        throw new AppError(
          `Discount code "${cleanCode}" does not apply to any products in this order`,
          400
        );
      }
    }

    let calculatedDiscountAmount = 0;
    const ruleValue = Number(discount.value);

    if (discount.discountType === 'PERCENTAGE') {
      // ruleValue e.g. 15 for 15%
      calculatedDiscountAmount = Number(((subtotal * ruleValue) / 100).toFixed(2));
    } else {
      // Fixed amount discount
      calculatedDiscountAmount = Math.min(subtotal, ruleValue);
    }

    return {
      discountRuleId: discount.id,
      code: discount.code,
      discountType: discount.discountType,
      value: ruleValue,
      discountAmount: Number(calculatedDiscountAmount.toFixed(2)),
    };
  }

  /**
   * Calculates discount amount for a given rule ID and subtotal without throwing exceptions.
   */
  static async calculateDiscount(
    discountRuleId: string,
    subtotal: number,
    productIds: string[] = []
  ): Promise<{ discountAmount: number }> {
    const discount = await prisma.discountRule.findUnique({
      where: { id: discountRuleId },
    });
    if (!discount || !discount.isActive) {
      return { discountAmount: 0 };
    }
    const ruleValue = Number(discount.value);
    let amount = 0;
    if (discount.discountType === 'PERCENTAGE') {
      amount = Number(((subtotal * ruleValue) / 100).toFixed(2));
    } else {
      amount = Math.min(subtotal, ruleValue);
    }
    return { discountAmount: Number(amount.toFixed(2)) };
  }
}
