import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/utils/prisma';

describe('Staff vs Admin Role Separation Test Suite', () => {
  let adminToken: string;
  let adminId: string;
  let staffToken: string;
  let staffId: string;
  let customer1Token: string;
  let customer1ProfileId: string;
  let customer2Token: string;
  let customer2ProfileId: string;

  let testProductId: string;
  let testPlanId: string;
  let testTaxId: string;
  let testDiscountId: string;
  let testInvoiceId: string;
  let testPaymentId: string;

  beforeAll(async () => {
    // 1. Admin Login
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@brightloop.com',
        password: 'Admin@Brightloop2026!',
      });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.token;
    adminId = adminRes.body.data.user.id;

    // 2. Staff Login
    const staffRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'staff@brightloop.com',
        password: 'Staff@Brightloop2026!',
      });
    expect(staffRes.status).toBe(200);
    staffToken = staffRes.body.data.token;
    staffId = staffRes.body.data.user.id;

    // 3. Customer 1 Login
    const cust1Res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'john.doe@example.com',
        password: 'Customer@Brightloop2026!',
      });
    expect(cust1Res.status).toBe(200);
    customer1Token = cust1Res.body.data.token;
    customer1ProfileId = cust1Res.body.data.user.customerId;

    // 4. Customer 2 Login
    const cust2Res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'jane.smith@example.com',
        password: 'Customer@Brightloop2026!',
      });
    expect(cust2Res.status).toBe(200);
    customer2Token = cust2Res.body.data.token;
    customer2ProfileId = cust2Res.body.data.user.customerId;

    // Fetch existing sample product, plan, tax, discount, invoice, payment for test assertions
    const sampleProduct = await prisma.product.findFirst();
    testProductId = sampleProduct!.id;

    const samplePlan = await prisma.plan.findFirst();
    testPlanId = samplePlan!.id;

    const sampleTax = await prisma.taxRule.findFirst();
    testTaxId = sampleTax!.id;

    const sampleDiscount = await prisma.discountRule.findFirst();
    testDiscountId = sampleDiscount!.id;

    const sampleInvoice = await prisma.invoice.findFirst();
    testInvoiceId = sampleInvoice!.id;

    const samplePayment = await prisma.payment.findFirst({ where: { status: 'SUCCESS' } });
    if (samplePayment) {
      testPaymentId = samplePayment.id;
    }
  });

  // =========================================================================
  // 1. STAFF 403 RESTRICTIONS ON WRITE / SENSITIVE ADMIN OPERATIONS
  // =========================================================================
  describe('Staff Access Restrictions (Enforced 403 Forbidden)', () => {
    it('Staff gets 403 on creating a product', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Staff Unauthorized Product',
          code: `PROD_UNAUTH_${Date.now()}`,
          type: 'SERVICE',
          salesPrice: 999,
          costPrice: 200,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Staff gets 403 on updating a product', async () => {
      const res = await request(app)
        .patch(`/api/v1/products/${testProductId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Hacked Product Name',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Staff gets 403 on creating a plan', async () => {
      const res = await request(app)
        .post('/api/v1/plans')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Staff Plan',
          code: `PLAN_UNAUTH_${Date.now()}`,
          billingFrequency: 'MONTHLY',
          basePrice: 500,
          minimumQuantity: 1,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Staff gets 403 on creating a tax rule', async () => {
      const res = await request(app)
        .post('/api/v1/taxes')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Staff Tax',
          code: 'TAX_STAFF',
          rate: 15,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Staff gets 403 on creating a discount rule', async () => {
      const res = await request(app)
        .post('/api/v1/discounts')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Staff 90% Discount',
          code: 'STAFF90',
          discountType: 'PERCENTAGE',
          value: 90,
          startDate: new Date().toISOString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Staff gets 403 on User & Staff Management (GET /users, POST /users)', async () => {
      const listRes = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(listRes.status).toBe(403);

      const createRes = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Staff Elevated',
          email: 'elevated@brightloop.com',
          password: 'Password123!',
          role: 'ADMIN',
        });
      expect(createRes.status).toBe(403);
    });

    it('Staff gets 403 on Audit Log access', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(res.status).toBe(403);
    });

    it('Staff gets 403 on Billing Engine runs & health', async () => {
      const triggerRes = await request(app)
        .post('/api/v1/billing/trigger')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(triggerRes.status).toBe(403);

      const runsRes = await request(app)
        .get('/api/v1/billing/runs')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(runsRes.status).toBe(403);

      const healthRes = await request(app)
        .get('/api/v1/billing/health')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(healthRes.status).toBe(403);
    });

    it('Staff gets 403 on Full Financial reports (MRR, revenue, overview, plans)', async () => {
      const overviewRes = await request(app)
        .get('/api/v1/reports/overview')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(overviewRes.status).toBe(403);

      const revenueRes = await request(app)
        .get('/api/v1/reports/revenue')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(revenueRes.status).toBe(403);

      const plansRes = await request(app)
        .get('/api/v1/reports/plans')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(plansRes.status).toBe(403);
    });

    it('Staff gets 403 on Payment Reversal', async () => {
      if (testPaymentId) {
        const res = await request(app)
          .post(`/api/v1/payments/${testPaymentId}/reverse`)
          .set('Authorization', `Bearer ${staffToken}`)
          .send({ reason: 'Staff attempt to reverse' });
        expect(res.status).toBe(403);
      }
    });
  });

  // =========================================================================
  // 2. STAFF 200 AUTHORIZED CAPABILITIES
  // =========================================================================
  describe('Staff Authorized Capabilities (200 OK / 201 Created)', () => {
    it('Staff gets 200 on reading catalog (products, plans, taxes, discounts)', async () => {
      const prodRes = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(prodRes.status).toBe(200);

      const planRes = await request(app)
        .get('/api/v1/plans')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(planRes.status).toBe(200);

      const taxRes = await request(app)
        .get('/api/v1/taxes')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(taxRes.status).toBe(200);

      const discRes = await request(app)
        .get('/api/v1/discounts')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(discRes.status).toBe(200);
    });

    it('Staff gets 200 on Customers CRUD', async () => {
      const listRes = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(listRes.status).toBe(200);

      const createRes = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Staff Customer Test',
          email: `staff_customer_${Date.now()}@example.com`,
          companyName: 'Staff Customer Co',
          phone: '+919988776655',
        });
      expect(createRes.status).toBe(201);
      const createdCustId = createRes.body.data.id;

      const detailRes = await request(app)
        .get(`/api/v1/customers/${createdCustId}`)
        .set('Authorization', `Bearer ${staffToken}`);
      expect(detailRes.status).toBe(200);

      const updateRes = await request(app)
        .patch(`/api/v1/customers/${createdCustId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ companyName: 'Staff Customer Updated Co' });
      expect(updateRes.status).toBe(200);
    });

    it('Staff gets 200 on Operational Dashboard (/reports/operational)', async () => {
      const res = await request(app)
        .get('/api/v1/reports/operational')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalCustomers).toBeDefined();
      expect(res.body.data.activeSubscriptionsCount).toBeDefined();
      expect(res.body.data.subscriptionStatusDistribution).toBeDefined();
      expect(res.body.data.invoicesAwaitingConfirmationCount).toBeDefined();
      expect(res.body.data.totalOutstandingAmount).toBeDefined();
      expect(res.body.data.overdueInvoices).toBeDefined();
      expect(res.body.data.recentPayments).toBeDefined();
      expect(res.body.data.upcomingRenewals).toBeDefined();

      // Ensure NO financial metrics leaked to Staff
      expect(res.body.data.totalInvoiced).toBeUndefined();
      expect(res.body.data.totalRevenue).toBeUndefined();
      expect(res.body.data.monthlyRevenue).toBeUndefined();
      expect(res.body.data.margin).toBeUndefined();
    });

    it('Staff gets 200 on Quotations, Subscriptions, Invoices, and Payments flow', async () => {
      // 1. Create Quotation
      const quoRes = await request(app)
        .post('/api/v1/quotations')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          customerId: customer1ProfileId,
          planId: testPlanId,
          validityDays: 15,
          lines: [{ productId: testProductId, quantity: 1 }],
        });
      expect(quoRes.status).toBe(201);
      const quotationId = quoRes.body.data.id;

      // 2. Confirm Quotation -> Subscription
      const confRes = await request(app)
        .post(`/api/v1/quotations/${quotationId}/confirm`)
        .set('Authorization', `Bearer ${staffToken}`);
      expect(confRes.status).toBe(200);
      const subscriptionId = confRes.body.data.subscription.id;

      // 3. Pause & Resume Subscription
      const pauseRes = await request(app)
        .post(`/api/v1/subscriptions/${subscriptionId}/pause`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ reason: 'Staff pause test' });
      // Either 200 or 400 depending on plan allowPause/status
      expect([200, 400]).toContain(pauseRes.status);

      // 4. Create Draft Invoice
      const invRes = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          customerId: customer1ProfileId,
          subscriptionId,
          dueDate: new Date(Date.now() + 15 * 86400000).toISOString(),
          lines: [
            {
              productId: testProductId,
              description: 'Operational invoice line',
              quantity: 1,
              unitPrice: 1200,
            },
          ],
        });
      expect(invRes.status).toBe(201);
      const newInvoiceId = invRes.body.data.id;

      // 5. Confirm Invoice
      const confInvRes = await request(app)
        .post(`/api/v1/invoices/${newInvoiceId}/confirm`)
        .set('Authorization', `Bearer ${staffToken}`);
      expect(confInvRes.status).toBe(200);

      // 6. Send Invoice Email
      const sendRes = await request(app)
        .post(`/api/v1/invoices/${newInvoiceId}/send`)
        .set('Authorization', `Bearer ${staffToken}`);
      expect(sendRes.status).toBe(200);

      // 7. Record Manual Payment
      const payRes = await request(app)
        .post('/api/v1/payments/manual')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          invoiceId: newInvoiceId,
          paymentMethod: 'BANK_TRANSFER',
          amount: 500,
          paymentDate: new Date().toISOString(),
          referenceNumber: `UTR_${Date.now()}`,
          notes: 'Staff verified offline bank settlement',
        });
      expect(payRes.status).toBe(201);

      // 8. Cancel Unpaid Invoice
      const cancelRes = await request(app)
        .post(`/api/v1/invoices/${newInvoiceId}/cancel`)
        .set('Authorization', `Bearer ${staffToken}`);
      expect(cancelRes.status).toBe(200);
    });
  });

  // =========================================================================
  // 3. COST PRICE STRIPPING & SENSITIVE DATA HYGIENE
  // =========================================================================
  describe('Cost Price Stripping at Serializer Layer', () => {
    it('costPrice is absent in Product List for Staff, present for Admin', async () => {
      const staffList = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(staffList.status).toBe(200);
      for (const prod of staffList.body.data) {
        expect(prod.costPrice).toBeUndefined();
      }

      const adminList = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminList.status).toBe(200);
      const hasCostPrice = adminList.body.data.some((p: any) => p.costPrice !== undefined);
      expect(hasCostPrice).toBe(true);
    });

    it('costPrice is absent in Product Detail for Staff', async () => {
      const staffDetail = await request(app)
        .get(`/api/v1/products/${testProductId}`)
        .set('Authorization', `Bearer ${staffToken}`);
      expect(staffDetail.status).toBe(200);
      expect(staffDetail.body.data.costPrice).toBeUndefined();

      const adminDetail = await request(app)
        .get(`/api/v1/products/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminDetail.status).toBe(200);
      expect(adminDetail.body.data.costPrice).toBeDefined();
    });

    it('costPrice is absent from nested product objects in Quotations and Subscriptions for Staff', async () => {
      const quoList = await request(app)
        .get('/api/v1/quotations')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(quoList.status).toBe(200);
      for (const quo of quoList.body.data) {
        if (quo.lines) {
          for (const line of quo.lines) {
            if (line.product) {
              expect(line.product.costPrice).toBeUndefined();
            }
          }
        }
      }

      const subList = await request(app)
        .get('/api/v1/subscriptions')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(subList.status).toBe(200);
      for (const sub of subList.body.data) {
        if (sub.lines) {
          for (const line of sub.lines) {
            if (line.product) {
              expect(line.product.costPrice).toBeUndefined();
            }
          }
        }
      }
    });
  });

  // =========================================================================
  // 4. CUSTOMER ISOLATION PRESERVED
  // =========================================================================
  describe('Customer Isolation & Perimeter Security', () => {
    it('Customer cannot access another customer profile', async () => {
      const res = await request(app)
        .get(`/api/v1/customers/${customer2ProfileId}`)
        .set('Authorization', `Bearer ${customer1Token}`);
      expect(res.status).toBe(403);
    });

    it('Customer cannot access staff/admin endpoints', async () => {
      // Cannot list all customers
      const custList = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${customer1Token}`);
      expect(custList.status).toBe(403);

      // Cannot access operational reports
      const opRep = await request(app)
        .get('/api/v1/reports/operational')
        .set('Authorization', `Bearer ${customer1Token}`);
      expect(opRep.status).toBe(403);

      // Cannot create products
      const prodCreate = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ name: 'Hacked', code: 'HACK', salesPrice: 10 });
      expect(prodCreate.status).toBe(403);
    });
  });

  // =========================================================================
  // 5. ADMIN REGRESSION (ADMIN RETAINS FULL ACCESS)
  // =========================================================================
  describe('Admin Full Access (Regression Prevention)', () => {
    it('Admin can access users, billing runs, audit logs, and financial reports', async () => {
      const usersRes = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(usersRes.status).toBe(200);

      const auditRes = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(auditRes.status).toBe(200);

      const healthRes = await request(app)
        .get('/api/v1/billing/health')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(healthRes.status).toBe(200);

      const overviewRes = await request(app)
        .get('/api/v1/reports/overview')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(overviewRes.status).toBe(200);

      const revenueRes = await request(app)
        .get('/api/v1/reports/revenue')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(revenueRes.status).toBe(200);
    });
  });
});
