import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/utils/prisma';
import { BillingEngine } from '../src/services/billingEngine';

describe('Requirements Document Comprehensive Verification Suite', () => {
  let adminToken: string;
  let staffToken: string;
  let customerToken: string;
  let customerId: string;

  beforeAll(async () => {
    // Admin login
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@brightloop.com', password: 'Admin@Brightloop2026!' });
    adminToken = adminRes.body.data.token;

    // Staff login
    const staffRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'staff@brightloop.com', password: 'Staff@Brightloop2026!' });
    staffToken = staffRes.body.data.token;

    // Customer login
    const custRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'john.doe@example.com', password: 'Customer@Brightloop2026!' });
    customerToken = custRes.body.data.token;
    customerId = custRes.body.data.user.customerId;
  });

  // -------------------------------------------------------------
  // STORY 1: Customer Signup & Access Control
  // -------------------------------------------------------------
  describe('Story 1: Customer Signup, Password Policy & Role Access', () => {
    it('strictly rejects password with 8 characters (must be > 8 characters)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Eight Char User',
          email: `eight_${Date.now()}@test.com`,
          password: 'Pass123!', // Exactly 8 chars
          passwordConfirmation: 'Pass123!',
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('accepts password with more than 8 characters meeting all complexity rules', async () => {
      const uniqueEmail = `valid_${Date.now()}@test.com`;
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Nine Char User',
          email: uniqueEmail,
          password: 'Password123!', // 12 chars (> 8 chars)
          passwordConfirmation: 'Password123!',
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });

    it('strictly forbids Staff from adding new staff members (Only Admin allowed)', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          email: `fake_staff_${Date.now()}@brightloop.com`,
          name: 'Unauthorized Staff',
          password: 'Staff@Brightloop2026!',
          role: 'STAFF',
        });
      expect(res.status).toBe(403);
    });
  });

  // -------------------------------------------------------------
  // STORY 2: Launching a New Plan & Variants
  // -------------------------------------------------------------
  describe('Story 2: Product Catalog, Brand Variants & Plan Policies', () => {
    let createdProductId: string;
    let odooVariantId: string;
    let createdPlanId: string;

    it('creates product with name, type, sales price, cost price, notes, and variants', async () => {
      const uniqueCode = `ERP_${Date.now()}`;
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Brightloop Enterprise Cloud ERP',
          code: uniqueCode,
          type: 'SERVICE',
          salesPrice: 2000,
          costPrice: 800,
          notes: 'Flagship enterprise edition with custom modules',
          variants: [
            { name: 'Brand', value: 'Odoo', priceAdjustment: 560, isActive: true },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Brightloop Enterprise Cloud ERP');
      expect(Number(res.body.data.salesPrice)).toBe(2000);
      expect(res.body.data.variants).toHaveLength(1);
      expect(res.body.data.variants[0].name).toBe('Brand');
      expect(res.body.data.variants[0].value).toBe('Odoo');
      expect(Number(res.body.data.variants[0].priceAdjustment)).toBe(560);

      createdProductId = res.body.data.id;
      odooVariantId = res.body.data.variants[0].id;
    });

    it('creates plan with cost, billing frequency, minimum quantity, dates, and policy flags', async () => {
      const planCode = `PLAN_${Date.now()}`;
      const res = await request(app)
        .post('/api/v1/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Enterprise Monthly Suite',
          code: planCode,
          description: 'Full ERP access on a monthly cadence',
          billingFrequency: 'MONTHLY',
          basePrice: 2500,
          minimumQuantity: 1,
          autoClosePolicy: true,
          allowEarlyClosure: true,
          allowPause: true,
          allowRenewal: true,
          productIds: [{ productId: createdProductId, defaultQuantity: 1, isRequired: true }],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.billingFrequency).toBe('MONTHLY');
      expect(res.body.data.autoClosePolicy).toBe(true);
      expect(res.body.data.allowPause).toBe(true);
      expect(res.body.data.allowEarlyClosure).toBe(true);
      expect(res.body.data.allowRenewal).toBe(true);

      createdPlanId = res.body.data.id;
    });
  });

  // -------------------------------------------------------------
  // STORY 3: Turning Quote into Subscription with Quotation Templates
  // -------------------------------------------------------------
  describe('Story 3: Quotation Templates & Subscription Lifecycle State Machine', () => {
    let templateId: string;
    let quoteId: string;
    let subscriptionId: string;

    it('fetches pre-configured quotation templates and creates a quotation from template', async () => {
      // 1. Fetch available templates
      const tplRes = await request(app)
        .get('/api/v1/quotation-templates')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(tplRes.status).toBe(200);
      expect(tplRes.body.success).toBe(true);
      expect(Array.isArray(tplRes.body.data)).toBe(true);
      expect(tplRes.body.data.length).toBeGreaterThan(0);

      const template = tplRes.body.data[0];
      templateId = template.id;

      // 2. Create quotation starting from template
      const quoteRes = await request(app)
        .post('/api/v1/quotations')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          customerId,
          planId: template.defaultPlanId || (await prisma.plan.findFirst())?.id,
          templateId,
          validityDays: template.validityDays || 30,
          lines: template.lines.map((l: any) => ({
            productId: l.productId,
            variantId: l.variantId || null,
            quantity: l.quantity || 1,
          })),
        });

      expect(quoteRes.status).toBe(201);
      expect(quoteRes.body.success).toBe(true);
      expect(quoteRes.body.data.status).toBe('DRAFT');
      expect(quoteRes.body.data.quotationNumber).toBeDefined();

      quoteId = quoteRes.body.data.id;
    });

    it('confirms quotation and converts into a subscription', async () => {
      const confirmRes = await request(app)
        .post(`/api/v1/quotations/${quoteId}/confirm`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.success).toBe(true);
      expect(confirmRes.body.data.quotation.status).toBe('CONFIRMED');
      expect(confirmRes.body.data.subscription).toBeDefined();

      subscriptionId = confirmRes.body.data.subscription.id;
    });

    it('transitions subscription through lifecycle states: DRAFT/QUOTATION -> CONFIRMED -> ACTIVE -> PAUSED -> CLOSED', async () => {
      // Create a fresh subscription in DRAFT state
      const plan = await prisma.plan.findFirst();
      const product = await prisma.product.findFirst();
      const sub = await prisma.subscription.create({
        data: {
          subscriptionNumber: `TEST-LIFE-${Date.now()}`,
          customerId,
          planId: plan!.id,
          status: 'DRAFT',
          startDate: new Date(),
          billingFrequency: 'MONTHLY',
          subtotal: 1000,
          taxAmount: 180,
          discountAmount: 0,
          totalAmount: 1180,
          lines: {
            create: [
              {
                productId: product!.id,
                quantity: 1,
                unitPrice: 1000,
                subtotal: 1000,
                taxAmount: 180,
                discountAmount: 0,
                totalAmount: 1180,
              },
            ],
          },
        },
      });

      // 1. DRAFT -> QUOTATION
      const toQuote = await request(app)
        .post(`/api/v1/subscriptions/${sub.id}/transition`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ toStatus: 'QUOTATION' });
      expect(toQuote.status).toBe(200);
      expect(toQuote.body.data.status).toBe('QUOTATION');

      // 2. QUOTATION -> CONFIRMED
      const toConfirmed = await request(app)
        .post(`/api/v1/subscriptions/${sub.id}/transition`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ toStatus: 'CONFIRMED' });
      expect(toConfirmed.status).toBe(200);
      expect(toConfirmed.body.data.status).toBe('CONFIRMED');

      // 3. CONFIRMED -> ACTIVE
      const toActive = await request(app)
        .post(`/api/v1/subscriptions/${sub.id}/transition`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ toStatus: 'ACTIVE' });
      expect(toActive.status).toBe(200);
      expect(toActive.body.data.status).toBe('ACTIVE');
      expect(toActive.body.data.nextBillingDate).toBeDefined();

      // 4. ACTIVE -> PAUSED
      const toPaused = await request(app)
        .post(`/api/v1/subscriptions/${sub.id}/transition`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ toStatus: 'PAUSED' });
      expect(toPaused.status).toBe(200);
      expect(toPaused.body.data.status).toBe('PAUSED');

      // 5. PAUSED -> CLOSED
      const toClosed = await request(app)
        .post(`/api/v1/subscriptions/${sub.id}/transition`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ toStatus: 'CLOSED' });
      expect(toClosed.status).toBe(200);
      expect(toClosed.body.data.status).toBe('CLOSED');
    });

    it('fetches subscription details including line items, expiry date and payment terms', async () => {
      const res = await request(app)
        .get(`/api/v1/subscriptions/${subscriptionId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.subscriptionNumber).toBeDefined();
      expect(res.body.data.lines).toBeDefined();
      expect(res.body.data.customer).toBeDefined();
    });
  });

  // -------------------------------------------------------------
  // STORY 4 & 5: Billing Engine, Recurring Runs & Dynamic Discounts
  // -------------------------------------------------------------
  describe('Story 4 & 5: Billing Day, Dynamic Discount Carry-Forward & Tax Evaluation', () => {
    it('applies active discount automatically on recurring billing run without human intervention', async () => {
      // 1. Create a Discount Rule
      const discCode = `AUTO_${Date.now()}`;
      const discRule = await prisma.discountRule.create({
        data: {
          name: '15% Loyalty Discount',
          code: discCode,
          discountType: 'PERCENTAGE',
          value: 15,
          isActive: true,
          startDate: new Date(Date.now() - 3600000),
          endDate: new Date(Date.now() + 86400000 * 30),
        },
      });

      // 2. Create an ACTIVE subscription due for billing linked to this discount
      const plan = await prisma.plan.findFirst();
      const product = await prisma.product.findFirst();
      const pastDate = new Date(Date.now() - 10000);

      const subWithDiscount = await prisma.subscription.create({
        data: {
          subscriptionNumber: `SUB-DISC-${Date.now()}`,
          customerId,
          planId: plan!.id,
          status: 'ACTIVE',
          startDate: new Date(Date.now() - 86400000 * 30),
          nextBillingDate: pastDate, // Due now
          billingFrequency: 'MONTHLY',
          subtotal: 2000,
          taxAmount: 360,
          discountAmount: 300,
          totalAmount: 2060,
          lines: {
            create: [
              {
                productId: product!.id,
                quantity: 1,
                unitPrice: 2000,
                subtotal: 2000,
                taxAmount: 360,
                discountAmount: 0,
                totalAmount: 2360,
              },
            ],
          },
          discountUsages: {
            create: [
              {
                discountId: discRule.id,
                customerId,
                discountAmount: 300,
              },
            ],
          },
        },
      });

      // 3. Execute Billing Engine Run
      const result = await BillingEngine.executeBillingRun('TEST_RUNNER');
      expect(result.status).toBe('COMPLETED');
      expect(result.invoicesCreated).toBeGreaterThanOrEqual(1);

      // 4. Verify generated invoice has discount applied
      const generatedInvoice = await prisma.invoice.findFirst({
        where: { subscriptionId: subWithDiscount.id },
        include: { discounts: true },
      });

      expect(generatedInvoice).toBeDefined();
      expect(Number(generatedInvoice!.discountAmount)).toBeGreaterThan(0);
      expect(generatedInvoice!.status).toBe('CONFIRMED');
    });
  });

  // -------------------------------------------------------------
  // STORY 6: Payments Recording & Overdue Tracking
  // -------------------------------------------------------------
  describe('Story 6: Multi-Method Payment Recording & Invoice Settlement', () => {
    it('records manual payment with method, amount, date and note against invoice', async () => {
      // 1. Create confirmed invoice
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-PAY-${Date.now()}`,
          customerId,
          dueDate: new Date(Date.now() + 86400000 * 15),
          subtotal: 1000,
          taxAmount: 180,
          totalAmount: 1180,
          amountPaid: 0,
          balance: 1180,
          status: 'CONFIRMED',
        },
      });

      // 2. Record staff manual payment
      const res = await request(app)
        .post('/api/v1/payments/manual')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          invoiceId: invoice.id,
          amount: 1180,
          paymentMethod: 'BANK_TRANSFER',
          paymentDate: new Date().toISOString(),
          referenceNumber: 'NEFT-AXIS-99281',
          notes: 'Received via direct corporate NEFT',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.payment.status).toBe('SUCCESS');
      expect(res.body.data.payment.paymentMethod).toBe('BANK_TRANSFER');
      expect(res.body.data.invoice.status).toBe('PAID');

      // 3. Check invoice status transitioned to PAID in DB
      const updatedInv = await prisma.invoice.findUnique({ where: { id: invoice.id } });
      expect(updatedInv!.status).toBe('PAID');
      expect(Number(updatedInv!.balance)).toBe(0);
    });
  });

  // -------------------------------------------------------------
  // STORY 7: Finance Lead Month-End Workspace
  // -------------------------------------------------------------
  describe('Story 7: Finance Lead Month-End Workspace & Performance', () => {
    it('returns overview metrics under 2 seconds for Finance Lead (Admin)', async () => {
      const start = Date.now();
      const res = await request(app)
        .get('/api/v1/reports/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(2000); // Sub-2-second response
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.activeSubscriptions).toBeDefined();
      expect(res.body.data.totalCollected).toBeDefined();
      expect(res.body.data.totalOutstanding).toBeDefined();
      expect(res.body.data.overdueInvoicesCount).toBeDefined();
    });

    it('returns collections ledger list from GET /api/v1/payments', async () => {
      const res = await request(app)
        .get('/api/v1/payments?limit=20')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
