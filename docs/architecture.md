# Brightloop Software — System Architecture

## 1. High-Level Architecture Overview

Brightloop Software is designed as a unified, modular monolithic subscription and recurring billing platform. It adheres to clean separation of concerns, transactional integrity for financial operations, strict role-based access control, and resilient background job scheduling.

```
+-----------------------------------------------------------------------+
|                             Client Layer                              |
|   +-----------------------+                    +------------------+   |
|   | Public Landing Page   |                    | Customer Portal  |   |
|   | & Checkout            |                    | Self-Service     |   |
|   +-----------------------+                    +------------------+   |
|                               +------------------+                    |
|                               | Admin & Staff    |                    |
|                               | Management UI    |                    |
|                               +------------------+                    |
+-----------------------------------------------------------------------+
                                   |
                         HTTPS / REST / JSON
                                   v
+-----------------------------------------------------------------------+
|                             API Gateway                               |
|   - Helmet Security Headers & CORS                                    |
|   - Rate Limiting                                                     |
|   - Request ID & Structured Pino Logging                              |
|   - Raw Webhook Body Capture for Razorpay Signature Verification      |
|   - JWT & Secure Cookie Session Handling                              |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                          Application Modules                          |
|  +--------------------+  +--------------------+  +-----------------+  |
|  | Auth & RBAC        |  | Product & Variant  |  | Subscription    |  |
|  | Module             |  | Module             |  | Lifecycle Engine|  |
|  +--------------------+  +--------------------+  +-----------------+  |
|  +--------------------+  +--------------------+  +-----------------+  |
|  | Recurring Billing  |  | Invoice & Tax      |  | Razorpay &      |  |
|  | Engine             |  | Module             |  | Manual Payments |  |
|  +--------------------+  +--------------------+  +-----------------+  |
|  +--------------------+  +--------------------+  +-----------------+  |
|  | Reporting & Metrics|  | Audit Trail &      |  | Email Service   |  |
|  | Engine             |  | System Alerts      |  | & PDF Generator |  |
|  +--------------------+  +--------------------+  +-----------------+  |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                           Data Persistence                            |
|                     PostgreSQL Database (Prisma ORM)                  |
|    - Decimal(12,2) for Money minor units                              |
|    - ACID Transactions for Invoicing & Payments                       |
|    - Idempotency via Unique Constraints                               |
|    - Normalized relational entities & B-Tree indexes                  |
+-----------------------------------------------------------------------+
```

## 2. Core Modules

### A. Authentication & Role-Based Access Control (RBAC)
- **Roles**:
  - `ADMIN`: Global administration, staff management, tax & discount configuration, system settings, billing runs, and full financial oversight.
  - `STAFF`: Day-to-day operations, customer assistance, manual invoice creation, quotations, authorized offline payment recording.
  - `CUSTOMER`: Strict self-service isolation. Can view and interact only with their own subscriptions, quotations, invoices, and payments.
- **Security**:
  - Passwords hashed using bcrypt (12 salt rounds) or Argon2id.
  - JWT tokens stored in HTTP-only, SameSite=Strict cookies or verified via Bearer Authorization header.
  - Ownership checking middleware ensuring `req.user.customerId === resource.customerId` on all customer routes.

### B. Variant Pricing Engine
- Products have a base sales price and cost price.
- Variants (e.g. tier, brand, storage) provide price adjustments.
- All unit price calculations happen authoritatively on the backend (`Base Price + SUM(Variant Adjustments)`); client-submitted prices are never trusted.

### C. Subscription Lifecycle Engine
- State flow: `DRAFT -> QUOTATION -> CONFIRMED -> ACTIVE -> CLOSED`.
- Optional state: `PAUSED` (with resume functionality).
- Expiry and Next Billing Date arithmetic:
  - Exact calendar date handling (e.g., Jan 31 + 1 month = Feb 28/29).
  - Daily, Weekly, Monthly, and Yearly intervals supported.

### D. Recurring Billing Engine & Idempotency
- Runs automatically via scheduled background workers and can also be triggered manually by administrators.
- **Idempotency Guarantee**:
  - Enforced via unique database constraint `(subscriptionId, billingPeriodStart)`.
  - Invoices generated within a database transaction.
  - Detailed `BillingRun` records track elapsed time, processed subscriptions, generated invoices, and errors.

### E. Invoice & Tax Calculation Engine
- Calculation order:
  1. Calculate line item subtotals (`quantity * unitPrice`).
  2. Evaluate eligible discounts (percentage or fixed, validating purchase minimums, quantity minimums, and usage limits).
  3. Calculate taxes (GST CGST/SGST/IGST or configurable percentage/fixed rules) on net taxable amount.
  4. Snapshot line item tax and discount rules in JSON for permanent historical immutability.
- Once confirmed, invoice records are immutable. Adjustments require explicit cancellation or credit notes.

### F. Razorpay Online Payment Integration
- Follows Razorpay standard checkout flow:
  1. Backend calculates authoritative payable balance and generates Razorpay Order via `razorpay.orders.create({ amount: paise, currency: 'INR', receipt })`.
  2. Frontend opens Razorpay Checkout modal with the Order ID.
  3. Customer completes transaction; Razorpay returns `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature`.
  4. Backend verifies HMAC-SHA256 signature using `RAZORPAY_KEY_SECRET`.
  5. Raw webhook events validated via `RAZORPAY_WEBHOOK_SECRET` with idempotent deduplication via `WebhookEvent.eventId`.
- Verified payments automatically allocate to invoices, update balances, and transition subscriptions to `ACTIVE` or `RENEWED`.

### G. Server-Side PDF Generation
- Uses `pdfkit` for high-performance, deterministic vector PDF generation.
- Generates professional tax invoices and quotations with company details, GSTIN, line-item breakdowns, tax snapshots, and payment instructions.
