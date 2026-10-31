# Brightloop Software — Database Schema Documentation

## 1. Overview
The database uses PostgreSQL via Prisma ORM. Financial figures use `Decimal(12, 2)` for amounts and `Decimal(6, 4)` for tax rates, eliminating floating-point rounding discrepancies.

## 2. Entity Relational Details

### Core Entities
1. **User**: Credentials, role (`ADMIN`, `STAFF`, `CUSTOMER`), active status, relations to CustomerProfile or StaffProfile.
2. **CustomerProfile**: Billing address, phone, GSTIN/taxId, credit balance, notes.
3. **StaffProfile**: Department, designation, granular permissions.
4. **PasswordResetToken**: Cryptographic reset tokens, 1-hour expiration, single-use tracking.

### Product Catalog & Plans
5. **Product**: Catalog items with type (`SERVICE`, `PHYSICAL`, `DIGITAL`), `salesPrice`, `costPrice`.
6. **ProductVariant**: Price adjustments (e.g. Odoo brand +₹560, Tier +₹2000).
7. **Plan**: Frequency (`DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`), availability window, pause/close policies.
8. **PlanProduct**: Maps products and default quantities to plans.

### Quotations & Lifecycle
9. **QuotationTemplate**: Reusable quotation templates with default line items and validity days.
10. **Quotation**: Formal customer quotations with validity dates and immutable pricing snapshots.
11. **QuotationLine**: Product, variant, quantity, unit price, tax, and discount snapshots.

### Subscriptions & Billing Engine
12. **Subscription**: Lifecycle states (`DRAFT`, `QUOTATION`, `CONFIRMED`, `ACTIVE`, `PAUSED`, `CLOSED`). Next billing date and start/expiry dates.
13. **SubscriptionLine**: Product lines with variant mappings.
14. **SubscriptionHistory**: Full audit trail of status transitions with actor and reason.
15. **BillingRun**: Execution records of recurring billing jobs.
16. **BillingRunItem**: Outcome per subscription (`SUCCESS`, `SKIPPED`, `FAILED`).

### Invoices & Financials
17. **Invoice**: Unique invoice number, subtotal, tax breakdown, discount breakdown, amount paid, and outstanding balance.
18. **InvoiceLine**: Immutable snapshots of prices, taxes, and discounts at confirmation time.
19. **TaxRule**: Configurable tax rules (percentage, fixed, GST CGST/SGST/IGST).
20. **DiscountRule**: Rules with usage limits, date ranges, and min purchase requirements.
21. **DiscountUsage**: Tracking discount redemptions per customer/subscription.

### Payments & Gateway Integration
22. **Payment**: Verified payments (online or offline), payment method, status, transaction IDs.
23. **InvoicePaymentAllocation**: Many-to-many allocation between payments and invoices.
24. **RazorpayOrder**: Razorpay order ID, amount in paise, currency, and receipt.
25. **WebhookEvent**: Raw event payloads with eventId idempotency deduplication.
26. **PaymentAttempt**: Audit trail of checkout sessions.

### Observability & Platform
27. **SystemAlert**: High-priority notifications for overdue invoices, renewals, and job failures.
28. **AuditLog**: Tamper-evident log of changes with before/after state diffs.
29. **ContactSubmission**: Public landing page contact inquiries.
30. **SystemSetting**: Dynamic administrative configuration keys.

## 3. Database Indexes & Constraints
- `Invoice`: Unique constraint on `(subscriptionId, billingPeriodStart)` prevents duplicate invoices.
- `Invoice`: Unique constraint on `invoiceNumber` and `idempotencyKey`.
- `Subscription`: Unique constraint on `subscriptionNumber`.
- `RazorpayOrder`: Unique constraint on `orderId`.
- `WebhookEvent`: Unique constraint on `eventId`.
- `ProductVariant`: Unique constraint on `(productId, name, value)`.
- B-Tree indexes on foreign keys, status fields, and date lookup columns (`nextBillingDate`, `dueDate`, `invoiceDate`).
