import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/utils/prisma';
import { RazorpayService } from '../src/services/razorpayService';

describe('Payment Processing and Reconciliation Suite', () => {
  let adminToken: string;
  let customerToken: string;
  let testInvoice: any;
  let customerId: string;

  beforeAll(async () => {
    // Login admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@brightloop.com', password: 'Admin@Brightloop2026!' });
    adminToken = adminRes.body.data.token;

    // Login customer
    const custRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'john.doe@example.com', password: 'Customer@Brightloop2026!' });
    customerToken = custRes.body.data.token;
    customerId = custRes.body.data.user.customerId;

    // Find an invoice with outstanding balance (or create one for test)
    const product = await prisma.product.findUnique({ where: { code: 'PROD_ERP' } });
    testInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-TEST-PAY-${Date.now()}`,
        customerId,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        subtotal: 1000.0,
        taxAmount: 180.0,
        totalAmount: 1180.0,
        amountPaid: 0.0,
        balance: 1180.0,
        status: 'CONFIRMED',
        lines: {
          create: [
            {
              productId: product!.id,
              description: 'Test Service Item',
              quantity: 1,
              unitPrice: 1000.0,
              subtotal: 1000.0,
              totalAmount: 1000.0,
            },
          ],
        },
      },
    });
  });

  describe('Razorpay Order Creation', () => {
    it('should create an authoritative Razorpay order for an unpaid invoice', async () => {
      const res = await request(app)
        .post('/api/v1/payments/razorpay/order')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ invoiceId: testInvoice.id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orderId).toBeDefined();
      expect(res.body.data.amount).toBe(1180.0);
      expect(res.body.data.amountInPaise).toBe(118000);
    });

    it('should reject payment signature verification on tampered data', async () => {
      const isValid = RazorpayService.verifyPaymentSignature({
        orderId: 'order_test_12345',
        paymentId: 'pay_test_99999',
        signature: 'invalid_tampered_signature_string',
      });
      expect(isValid).toBe(false);
    });
  });

  describe('Manual Offline Payment Recording', () => {
    it('should record an offline partial payment and reduce invoice balance', async () => {
      const res = await request(app)
        .post('/api/v1/payments/manual')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          invoiceId: testInvoice.id,
          amount: 500.0,
          paymentMethod: 'BANK_TRANSFER',
          referenceNumber: 'HDFC-NEFT-987654321',
          notes: 'Customer transferred via NEFT',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.payment.paymentMethod).toBe('BANK_TRANSFER');
      expect(Number(res.body.data.invoice.amountPaid)).toBe(500.0);
      expect(Number(res.body.data.invoice.balance)).toBe(680.0); // 1180 - 500
      expect(res.body.data.invoice.status).toBe('PARTIALLY_PAID');
    });

    it('should reject manual payment exceeding current balance', async () => {
      const res = await request(app)
        .post('/api/v1/payments/manual')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          invoiceId: testInvoice.id,
          amount: 50000.0, // Far exceeds balance of 680
          paymentMethod: 'CASH',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('cannot exceed current outstanding balance');
    });

    it('should record the remaining payment and transition invoice to PAID', async () => {
      const res = await request(app)
        .post('/api/v1/payments/manual')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          invoiceId: testInvoice.id,
          amount: 680.0, // Remaining balance
          paymentMethod: 'UPI',
          referenceNumber: 'UPI/9876543210/ref',
        });

      expect(res.status).toBe(201);
      expect(Number(res.body.data.invoice.amountPaid)).toBe(1180.0);
      expect(Number(res.body.data.invoice.balance)).toBe(0.0);
      expect(res.body.data.invoice.status).toBe('PAID');
    });
  });
});
