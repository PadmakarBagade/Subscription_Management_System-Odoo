import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Brightloop Software database seeding...');

  // 1. Create Tax Rules
  console.log('-> Creating Tax Rules...');
  const gst18 = await prisma.taxRule.upsert({
    where: { code: 'GST_18' },
    update: {},
    create: {
      name: 'GST 18% (Intrastate CGST 9% + SGST 9%)',
      code: 'GST_18',
      taxType: 'PERCENTAGE',
      rate: 0.18,
      isGst: true,
      cgstRate: 0.09,
      sgstRate: 0.09,
      isActive: true,
      priority: 1,
    },
  });

  const igst18 = await prisma.taxRule.upsert({
    where: { code: 'IGST_18' },
    update: {},
    create: {
      name: 'IGST 18% (Interstate Integrated GST)',
      code: 'IGST_18',
      taxType: 'PERCENTAGE',
      rate: 0.18,
      isGst: true,
      igstRate: 0.18,
      isActive: true,
      priority: 2,
    },
  });

  // 2. Create Discount Rules
  console.log('-> Creating Discount Rules...');
  const discountWelcome = await prisma.discountRule.upsert({
    where: { code: 'WELCOME20' },
    update: {},
    create: {
      name: 'New Customer Welcome 20%',
      code: 'WELCOME20',
      discountType: 'PERCENTAGE',
      value: 20.0,
      minPurchaseAmount: 1500.0,
      usageLimit: 500,
      isActive: true,
    },
  });

  const discountFlat500 = await prisma.discountRule.upsert({
    where: { code: 'FLAT500' },
    update: {},
    create: {
      name: 'Flat ₹500 Loyalty Savings',
      code: 'FLAT500',
      discountType: 'FIXED_AMOUNT',
      value: 500.0,
      minPurchaseAmount: 2500.0,
      usageLimit: 200,
      isActive: true,
    },
  });

  // 3. Create Products and Variants
  console.log('-> Creating Products and Variants...');
  const erpProduct = await prisma.product.upsert({
    where: { code: 'PROD_ERP' },
    update: {},
    create: {
      name: 'Brightloop Cloud Core ERP',
      code: 'PROD_ERP',
      type: 'SERVICE',
      salesPrice: 2000.0,
      costPrice: 600.0,
      notes: 'Full subscription billing and ERP management suite',
      isActive: true,
      variants: {
        create: [
          { name: 'Connector', value: 'Odoo Brand Connector', priceAdjustment: 560.0, isActive: true },
          { name: 'Connector', value: 'Standard Webhook API', priceAdjustment: 0.0, isActive: true },
          { name: 'Environment', value: 'High Availability Multi-AZ', priceAdjustment: 1200.0, isActive: true },
        ],
      },
    },
    include: { variants: true },
  });

  const billingEngineProduct = await prisma.product.upsert({
    where: { code: 'PROD_BILLING' },
    update: {},
    create: {
      name: 'Automated Recurring Billing Engine',
      code: 'PROD_BILLING',
      type: 'DIGITAL',
      salesPrice: 1500.0,
      costPrice: 400.0,
      notes: 'Scheduled invoice generation and Razorpay autopay',
      isActive: true,
      variants: {
        create: [
          { name: 'Capacity', value: 'Up to 5,000 active subscribers', priceAdjustment: 0.0, isActive: true },
          { name: 'Capacity', value: 'Up to 50,000 active subscribers', priceAdjustment: 1500.0, isActive: true },
        ],
      },
    },
    include: { variants: true },
  });

  const supportProduct = await prisma.product.upsert({
    where: { code: 'PROD_SUPPORT' },
    update: {},
    create: {
      name: '24/7 Dedicated Priority SLA',
      code: 'PROD_SUPPORT',
      type: 'SERVICE',
      salesPrice: 800.0,
      costPrice: 250.0,
      notes: 'Guaranteed 1-hour response SLA with dedicated account manager',
      isActive: true,
      variants: {
        create: [
          { name: 'Tier', value: 'Silver Business Hours', priceAdjustment: 0.0, isActive: true },
          { name: 'Tier', value: 'Gold 24/7 Dedicated', priceAdjustment: 700.0, isActive: true },
        ],
      },
    },
    include: { variants: true },
  });

  // 4. Create Subscription Plans
  console.log('-> Creating Subscription Plans...');
  const starterPlan = await prisma.plan.upsert({
    where: { code: 'PLAN_STARTER' },
    update: {},
    create: {
      name: 'Starter Cloud Plan',
      code: 'PLAN_STARTER',
      description: 'Ideal for growing businesses automating customer subscriptions and invoices.',
      billingFrequency: 'MONTHLY',
      basePrice: 2000.0,
      minimumQuantity: 1,
      isActive: true,
      allowPause: true,
      allowEarlyClosure: true,
      allowRenewal: true,
      planProducts: {
        create: [
          { productId: erpProduct.id, defaultQuantity: 1, isRequired: true },
        ],
      },
    },
  });

  const businessPlan = await prisma.plan.upsert({
    where: { code: 'PLAN_BUSINESS' },
    update: {},
    create: {
      name: 'Growth Business Suite',
      code: 'PLAN_BUSINESS',
      description: 'Comprehensive package with ERP, Billing Engine, and multi-tenant connector.',
      billingFrequency: 'MONTHLY',
      basePrice: 3500.0,
      minimumQuantity: 1,
      isActive: true,
      allowPause: true,
      allowEarlyClosure: true,
      allowRenewal: true,
      planProducts: {
        create: [
          { productId: erpProduct.id, defaultQuantity: 1, isRequired: true },
          { productId: billingEngineProduct.id, defaultQuantity: 1, isRequired: true },
        ],
      },
    },
  });

  const enterprisePlan = await prisma.plan.upsert({
    where: { code: 'PLAN_ENTERPRISE_ANNUAL' },
    update: {},
    create: {
      name: 'Enterprise Annual Suite',
      code: 'PLAN_ENTERPRISE_ANNUAL',
      description: 'Unlimited capacity, 24/7 dedicated engineer SLA, and annual billing savings.',
      billingFrequency: 'YEARLY',
      basePrice: 42000.0,
      minimumQuantity: 1,
      isActive: true,
      allowPause: true,
      allowEarlyClosure: false,
      allowRenewal: true,
      planProducts: {
        create: [
          { productId: erpProduct.id, defaultQuantity: 1, isRequired: true },
          { productId: billingEngineProduct.id, defaultQuantity: 1, isRequired: true },
          { productId: supportProduct.id, defaultQuantity: 1, isRequired: true },
        ],
      },
    },
  });

  // 5. Create Users (Admin, Staff, Customers)
  console.log('-> Creating Users...');
  const adminPasswordHash = await bcrypt.hash('Admin@Brightloop2026!', 12);
  const staffPasswordHash = await bcrypt.hash('Staff@Brightloop2026!', 12);
  const customerPasswordHash = await bcrypt.hash('Customer@Brightloop2026!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@brightloop.com' },
    update: {},
    create: {
      name: 'System Administrator',
      email: 'admin@brightloop.com',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      staffProfile: {
        create: {
          department: 'Executive Leadership',
          designation: 'Principal Architect & Admin',
        },
      },
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: 'staff@brightloop.com' },
    update: {},
    create: {
      name: 'Sarah Operations',
      email: 'staff@brightloop.com',
      passwordHash: staffPasswordHash,
      role: 'STAFF',
      status: 'ACTIVE',
      staffProfile: {
        create: {
          department: 'Customer Billing Operations',
          designation: 'Senior Billing Manager',
        },
      },
    },
  });

  // Customer 1: Acme Innovations
  const userCustomer1 = await prisma.user.upsert({
    where: { email: 'john.doe@example.com' },
    update: {},
    create: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      passwordHash: customerPasswordHash,
      role: 'CUSTOMER',
      status: 'ACTIVE',
      customerProfile: {
        create: {
          companyName: 'Acme Innovations Pvt Ltd',
          phone: '+91 98765 43210',
          billingAddress: '101 Cyber City, Hitec City, Hyderabad, TG 500081',
          shippingAddress: '101 Cyber City, Hitec City, Hyderabad, TG 500081',
          taxId: '36ABCDE1234F1Z5',
          currency: 'INR',
          creditBalance: 0.0,
        },
      },
    },
    include: { customerProfile: true },
  });

  // Customer 2: Nexus Digital
  const userCustomer2 = await prisma.user.upsert({
    where: { email: 'jane.smith@example.com' },
    update: {},
    create: {
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      passwordHash: customerPasswordHash,
      role: 'CUSTOMER',
      status: 'ACTIVE',
      customerProfile: {
        create: {
          companyName: 'Nexus Digital Systems',
          phone: '+91 98450 11223',
          billingAddress: '42 MG Road, Bengaluru, KA 560001',
          shippingAddress: '42 MG Road, Bengaluru, KA 560001',
          taxId: '29AABCN1234K1Z9',
          currency: 'INR',
          creditBalance: 500.0,
        },
      },
    },
    include: { customerProfile: true },
  });

  // 6. Create Active Subscriptions and Invoices
  console.log('-> Creating Subscriptions and Invoices...');
  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const odooVariant = erpProduct.variants.find((v) => v.value === 'Odoo Brand Connector');

  // Customer 1 Subscription
  const sub1 = await prisma.subscription.upsert({
    where: { subscriptionNumber: 'SUB-2026-001' },
    update: {},
    create: {
      subscriptionNumber: 'SUB-2026-001',
      customerId: userCustomer1.customerProfile!.id,
      planId: businessPlan.id,
      status: 'ACTIVE',
      startDate: now,
      nextBillingDate: nextMonth,
      billingFrequency: 'MONTHLY',
      paymentTermType: 'IMMEDIATE',
      subtotal: 4060.0,
      taxAmount: 730.8,
      discountAmount: 0.0,
      totalAmount: 4790.8,
      lines: {
        create: [
          {
            productId: erpProduct.id,
            variantId: odooVariant?.id,
            quantity: 1,
            unitPrice: 2560.0, // 2000 + 560
            subtotal: 2560.0,
            totalAmount: 2560.0,
          },
          {
            productId: billingEngineProduct.id,
            quantity: 1,
            unitPrice: 1500.0,
            subtotal: 1500.0,
            totalAmount: 1500.0,
          },
        ],
      },
    },
  });

  // Invoice 1 (Paid)
  const inv1 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2026-001' },
    update: {},
    create: {
      invoiceNumber: 'INV-2026-001',
      customerId: userCustomer1.customerProfile!.id,
      subscriptionId: sub1.id,
      billingPeriodStart: now,
      billingPeriodEnd: nextMonth,
      invoiceDate: now,
      dueDate: now,
      subtotal: 4060.0,
      taxAmount: 730.8,
      discountAmount: 0.0,
      totalAmount: 4790.8,
      amountPaid: 4790.8,
      balance: 0.0,
      status: 'PAID',
      confirmedAt: now,
      paidAt: now,
      lines: {
        create: [
          {
            productId: erpProduct.id,
            variantId: odooVariant?.id,
            description: 'Brightloop Cloud Core ERP (Connector: Odoo Brand Connector)',
            quantity: 1,
            unitPrice: 2560.0,
            subtotal: 2560.0,
            totalAmount: 2560.0,
          },
          {
            productId: billingEngineProduct.id,
            description: 'Automated Recurring Billing Engine (Standard 5k)',
            quantity: 1,
            unitPrice: 1500.0,
            subtotal: 1500.0,
            totalAmount: 1500.0,
          },
        ],
      },
      taxes: {
        create: [
          {
            taxRuleId: gst18.id,
            taxName: gst18.name,
            taxRate: 0.18,
            taxAmount: 730.8,
          },
        ],
      },
      payments: {
        create: [
          {
            paymentNumber: 'PAY-2026-001',
            customerId: userCustomer1.customerProfile!.id,
            paymentMethod: 'RAZORPAY',
            amount: 4790.8,
            status: 'SUCCESS',
            providerPaymentId: 'pay_test_seeded_razorpay_01',
            referenceNumber: 'order_test_seeded_order_01',
            notes: 'Initial verified Razorpay online payment',
          },
        ],
      },
    },
  });

  // Customer 2 Subscription (Overdue Invoice Example)
  const pastDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
  const overdueDueDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

  const sub2 = await prisma.subscription.upsert({
    where: { subscriptionNumber: 'SUB-2026-002' },
    update: {},
    create: {
      subscriptionNumber: 'SUB-2026-002',
      customerId: userCustomer2.customerProfile!.id,
      planId: starterPlan.id,
      status: 'ACTIVE',
      startDate: pastDate,
      nextBillingDate: now,
      billingFrequency: 'MONTHLY',
      subtotal: 2000.0,
      taxAmount: 360.0,
      discountAmount: 0.0,
      totalAmount: 2360.0,
      lines: {
        create: [
          {
            productId: erpProduct.id,
            quantity: 1,
            unitPrice: 2000.0,
            subtotal: 2000.0,
            totalAmount: 2000.0,
          },
        ],
      },
    },
  });

  // Invoice 2 (Confirmed, Unpaid / Overdue)
  await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2026-002' },
    update: {},
    create: {
      invoiceNumber: 'INV-2026-002',
      customerId: userCustomer2.customerProfile!.id,
      subscriptionId: sub2.id,
      billingPeriodStart: pastDate,
      billingPeriodEnd: now,
      invoiceDate: pastDate,
      dueDate: overdueDueDate,
      subtotal: 2000.0,
      taxAmount: 360.0,
      discountAmount: 0.0,
      totalAmount: 2360.0,
      amountPaid: 0.0,
      balance: 2360.0,
      status: 'OVERDUE',
      confirmedAt: pastDate,
      lines: {
        create: [
          {
            productId: erpProduct.id,
            description: 'Brightloop Cloud Core ERP (Standard)',
            quantity: 1,
            unitPrice: 2000.0,
            subtotal: 2000.0,
            totalAmount: 2000.0,
          },
        ],
      },
      taxes: {
        create: [
          {
            taxRuleId: gst18.id,
            taxName: gst18.name,
            taxRate: 0.18,
            taxAmount: 360.0,
          },
        ],
      },
    },
  });

  // Create initial System Alert
  await prisma.systemAlert.create({
    data: {
      alertType: 'OVERDUE_INVOICE',
      severity: 'HIGH',
      title: 'Overdue Invoice Alert: INV-2026-002',
      message: 'Invoice INV-2026-002 for Nexus Digital Systems is past due. Outstanding: ₹2,360',
      entityType: 'INVOICE',
      isReviewed: false,
    },
  });

  console.log('✅ Brightloop Software database seeding completed successfully!');
  console.log('-------------------------------------------------------------');
  console.log('Admin Login:    admin@brightloop.com / Admin@Brightloop2026!');
  console.log('Staff Login:    staff@brightloop.com / Staff@Brightloop2026!');
  console.log('Customer Login: john.doe@example.com / Customer@Brightloop2026!');
  console.log('-------------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
