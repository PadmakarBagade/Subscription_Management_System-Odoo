import { PricingService } from './pricingService';
import { DiscountService } from './discountService';
import { TaxService } from './taxService';
import { BillingFrequency } from '@brightloop/shared';

export interface SimulatorItemInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

export class SimulatorService {
  /**
   * Simulates a billing scenario without persisting any records.
   * Reuses the exact same calculation services as the real billing engine.
   */
  static async simulateBilling(params: {
    planId?: string | null;
    billingFrequency: BillingFrequency;
    items: SimulatorItemInput[];
    discountCode?: string | null;
    taxRuleIds?: string[] | null;
  }) {
    const { items, discountCode, taxRuleIds, billingFrequency } = params;

    let subtotal = 0;
    let totalQuantity = 0;
    const calculatedLines = [];
    const productIds: string[] = [];

    for (const item of items) {
      const line = await PricingService.calculateProductLine(
        item.productId,
        item.variantId,
        item.quantity
      );
      calculatedLines.push(line);
      subtotal += line.lineSubtotal;
      totalQuantity += item.quantity;
      productIds.push(item.productId);
    }

    // Evaluate discount if provided
    let discountResult = null;
    let discountAmount = 0;

    if (discountCode) {
      discountResult = await DiscountService.evaluateDiscount(
        discountCode,
        subtotal,
        totalQuantity,
        productIds
      );
      if (discountResult) {
        discountAmount = discountResult.discountAmount;
      }
    }

    const netTaxableAmount = Math.max(0, subtotal - discountAmount);

    // Calculate taxes
    const taxResult = await TaxService.calculateTaxes(netTaxableAmount, taxRuleIds);

    const totalAmount = Number((netTaxableAmount + taxResult.totalTaxAmount).toFixed(2));

    return {
      billingFrequency,
      lines: calculatedLines,
      subtotal: Number(subtotal.toFixed(2)),
      discount: discountResult,
      discountAmount,
      netTaxableAmount: Number(netTaxableAmount.toFixed(2)),
      taxes: taxResult.taxes,
      totalTaxAmount: taxResult.totalTaxAmount,
      totalAmount,
    };
  }
}
