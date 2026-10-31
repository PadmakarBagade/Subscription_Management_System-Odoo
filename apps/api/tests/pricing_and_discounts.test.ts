import { describe, it, expect, beforeAll } from 'vitest';
import { PricingService } from '../src/services/pricingService';
import { DiscountService } from '../src/services/discountService';
import { TaxService } from '../src/services/taxService';
import { prisma } from '../src/utils/prisma';

describe('Pricing, Discount, and Tax Calculation Suite', () => {
  let erpProduct: any;
  let odooVariant: any;
  let standardVariant: any;

  beforeAll(async () => {
    erpProduct = await prisma.product.findUnique({
      where: { code: 'PROD_ERP' },
      include: { variants: true },
    });
    odooVariant = erpProduct.variants.find((v: any) => v.value === 'Odoo Brand Connector');
    standardVariant = erpProduct.variants.find((v: any) => v.value === 'Standard Webhook API');
  });

  describe('Authoritative Variant Pricing', () => {
    it('should calculate base price when no variant is selected', async () => {
      const calc = await PricingService.calculateProductLine(erpProduct.id, null, 1);
      expect(calc.baseUnitPrice).toBe(2000.0);
      expect(calc.variantAdjustment).toBe(0.0);
      expect(calc.finalUnitPrice).toBe(2000.0);
      expect(calc.lineSubtotal).toBe(2000.0);
    });

    it('should add variant price adjustment correctly (₹2000 + ₹560 = ₹2560)', async () => {
      const calc = await PricingService.calculateProductLine(erpProduct.id, odooVariant.id, 2);
      expect(calc.baseUnitPrice).toBe(2000.0);
      expect(calc.variantAdjustment).toBe(560.0);
      expect(calc.finalUnitPrice).toBe(2560.0);
      // Qty 2 -> ₹2560 * 2 = ₹5120
      expect(calc.lineSubtotal).toBe(5120.0);
    });

    it('should throw error for invalid variant ID', async () => {
      await expect(
        PricingService.calculateProductLine(erpProduct.id, '00000000-0000-0000-0000-000000000000', 1)
      ).rejects.toThrow();
    });
  });

  describe('Discount Rules Engine', () => {
    it('should calculate percentage discount accurately (20% off ₹3000 = ₹600)', async () => {
      const discount = await DiscountService.evaluateDiscount('WELCOME20', 3000.0, 2);
      expect(discount).not.toBeNull();
      expect(discount?.discountAmount).toBe(600.0);
    });

    it('should enforce minimum purchase requirements', async () => {
      // WELCOME20 requires min purchase ₹1500
      await expect(DiscountService.evaluateDiscount('WELCOME20', 1000.0, 1)).rejects.toThrow(
        /Minimum purchase amount/
      );
    });

    it('should calculate fixed amount discount correctly (FLAT500 off ₹4000 = ₹500)', async () => {
      const discount = await DiscountService.evaluateDiscount('FLAT500', 4000.0, 2);
      expect(discount).not.toBeNull();
      expect(discount?.discountAmount).toBe(500.0);
    });

    it('should reject invalid discount code with 404', async () => {
      await expect(DiscountService.evaluateDiscount('DOES_NOT_EXIST', 2000.0, 1)).rejects.toThrow(
        /invalid/i
      );
    });
  });

  describe('Tax Calculation Engine', () => {
    it('should calculate 18% GST on taxable subtotal (18% of ₹10,000 = ₹1,800)', async () => {
      const taxResult = await TaxService.calculateTaxes(10000.0);
      expect(taxResult.totalTaxAmount).toBeGreaterThan(0);
      // Look for GST 18% rule
      const gst = taxResult.taxes.find((t) => t.taxName.includes('GST 18%'));
      expect(gst).toBeDefined();
      expect(gst?.taxAmount).toBe(1800.0);
    });

    it('should return 0 tax on zero or negative taxable amounts', async () => {
      const taxResult = await TaxService.calculateTaxes(0);
      expect(taxResult.totalTaxAmount).toBe(0);
      expect(taxResult.taxes.length).toBe(0);
    });
  });
});
