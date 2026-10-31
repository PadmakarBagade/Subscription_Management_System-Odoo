import { prisma } from '../utils/prisma';

export interface CalculatedTaxItem {
  taxRuleId: string;
  taxName: string;
  taxRate: number;
  taxAmount: number;
}

export class TaxService {
  /**
   * Calculates applicable taxes on the net taxable amount (subtotal - discount).
   * Supports standard GST rules (CGST/SGST/IGST) and custom percentage/fixed tax rules.
   */
  static async calculateTaxes(
    netTaxableAmount: number,
    taxRuleIds?: string[] | null
  ): Promise<{
    taxes: CalculatedTaxItem[];
    totalTaxAmount: number;
  }> {
    if (netTaxableAmount <= 0) {
      return { taxes: [], totalTaxAmount: 0 };
    }

    const now = new Date();

    // Fetch active tax rules
    const query: any = {
      where: {
        isActive: true,
        OR: [
          { effectiveFrom: null, effectiveTo: null },
          { effectiveFrom: { lte: now }, effectiveTo: null },
          { effectiveFrom: null, effectiveTo: { gte: now } },
          { effectiveFrom: { lte: now }, effectiveTo: { gte: now } },
        ],
      },
      orderBy: { priority: 'asc' },
    };

    if (taxRuleIds && taxRuleIds.length > 0) {
      query.where.id = { in: taxRuleIds };
    }

    const rules = await prisma.taxRule.findMany(query);

    const taxes: CalculatedTaxItem[] = [];
    let totalTaxAmount = 0;

    for (const rule of rules) {
      const rate = Number(rule.rate);
      let amount = 0;

      if (rule.taxType === 'PERCENTAGE') {
        // If rate is entered as 0.18 or 18%
        const normalizedRate = rate > 1 ? rate / 100 : rate;
        amount = Number((netTaxableAmount * normalizedRate).toFixed(2));
      } else {
        // Fixed tax amount
        amount = Number(rate.toFixed(2));
      }

      taxes.push({
        taxRuleId: rule.id,
        taxName: rule.name,
        taxRate: rate > 1 ? rate / 100 : rate,
        taxAmount: amount,
      });

      totalTaxAmount += amount;
    }

    return {
      taxes,
      totalTaxAmount: Number(totalTaxAmount.toFixed(2)),
    };
  }
}
