# Brightloop Software — Implementation Checklist & Architecture Mapping

## 1. System Requirements to Architecture Mapping

| Requirement Module | Database Entities | API Endpoints | Business Services | Frontend Screens / Components | Validation Rules | Test Suites |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Authentication & RBAC** | `User`, `CustomerProfile`, `StaffProfile`, `PasswordResetToken` | `POST /api/v1/auth/register`<br>`POST /api/v1/auth/login`<br>`POST /api/v1/auth/logout`<br>`POST /api/v1/auth/forgot-password`<br>`POST /api/v1/auth/reset-password`<br>`GET /api/v1/auth/me` | `AuthService`, `TokenService`, `EmailService` | `LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `AuthGuard`, `RoleGuard` | Email normalization, 8+ chars password with upper/lower/special, token expiration, one-time use | `auth.test.ts`, `rbac.test.ts` |
| **Customers & Staff** | `User`, `CustomerProfile`, `StaffProfile`, `AuditLog` | `GET /api/v1/customers`<br>`POST /api/v1/customers`<br>`GET /api/v1/customers/:id`<br>`PATCH /api/v1/customers/:id`<br>`GET /api/v1/staff`<br>`POST /api/v1/staff` | `CustomerService`, `StaffService`, `AuditService` | `CustomerListPage`, `CustomerDetailPage`, `StaffManagementPage`, `CustomerModal` | Valid email, phone format, tax/GST identifier, address schema | `customer.test.ts`, `staff.test.ts` |
| **Products & Variants** | `Product`, `ProductVariant` | `GET /api/v1/products`<br>`POST /api/v1/products`<br>`GET /api/v1/products/:id`<br>`PATCH /api/v1/products/:id`<br>`DELETE /api/v1/products/:id` | `ProductService`, `VariantPricingService` | `ProductListPage`, `ProductDetailPage`, `ProductFormModal`, `VariantManager` | Non-negative price, unique variant per product, non-empty name | `product.test.ts`, `variant.test.ts` |
| **Subscription Plans** | `Plan`, `PlanProduct` | `GET /api/v1/plans`<br>`POST /api/v1/plans`<br>`GET /api/v1/plans/:id`<br>`PATCH /api/v1/plans/:id` | `PlanService`, `DateArithmeticService` | `PlanListPage`, `PlanFormModal`, `PricingSection` (Landing page) | Frequency in `[DAILY, WEEKLY, MONTHLY, YEARLY]`, min quantity >= 1, valid date ranges | `plan.test.ts`, `date_arithmetic.test.ts` |
| **Quotations & Templates** | `QuotationTemplate`, `QuotationTemplateLine`, `Quotation`, `QuotationLine` | `GET /api/v1/quotation-templates`<br>`POST /api/v1/quotation-templates`<br>`GET /api/v1/quotations`<br>`POST /api/v1/quotations`<br>`GET /api/v1/quotations/:id`<br>`POST /api/v1/quotations/:id/confirm`<br>`GET /api/v1/quotations/:id/pdf` | `QuotationService`, `QuotationPdfService` | `QuotationListPage`, `QuotationDetailPage`, `QuotationBuilderPage`, `TemplateListPage` | Expiration check before confirmation, immutable price snapshot | `quotation.test.ts`, `quotation_pdf.test.ts` |
| **Subscriptions Lifecycle** | `Subscription`, `SubscriptionLine`, `SubscriptionHistory` | `GET /api/v1/subscriptions`<br>`POST /api/v1/subscriptions`<br>`GET /api/v1/subscriptions/:id`<br>`POST /api/v1/subscriptions/:id/pause`<br>`POST /api/v1/subscriptions/:id/resume`<br>`POST /api/v1/subscriptions/:id/renew`<br>`POST /api/v1/subscriptions/:id/cancel` | `SubscriptionService`, `LifecycleEngine` | `SubscriptionListPage`, `SubscriptionDetailPage`, `CustomerSubscriptionView` | States: `DRAFT -> QUOTATION -> CONFIRMED -> ACTIVE -> CLOSED` (and `PAUSED`). Valid transitions only. | `subscription_lifecycle.test.ts`, `ownership.test.ts` |
| **Recurring Billing Engine** | `BillingRun`, `BillingRunItem`, `Invoice` | `POST /api/v1/billing/trigger`<br>`GET /api/v1/billing/runs`<br>`GET /api/v1/billing/runs/:id` | `BillingEngine`, `PricingCalculator`, `TaxService`, `DiscountService` | `BillingJobsPage`, `BillingRunDetailPage` | Idempotency key `(subscriptionId, periodStart)`, transaction isolation, status checks | `billing_engine.test.ts`, `idempotency.test.ts` |
| **Invoice Management** | `Invoice`, `InvoiceLine`, `InvoiceTax`, `InvoiceDiscount` | `GET /api/v1/invoices`<br>`POST /api/v1/invoices`<br>`GET /api/v1/invoices/:id`<br>`POST /api/v1/invoices/:id/confirm`<br>`POST /api/v1/invoices/:id/cancel`<br>`GET /api/v1/invoices/:id/pdf` | `InvoiceService`, `InvoicePdfService` | `InvoiceListPage`, `InvoiceDetailPage`, `InvoiceCreateModal`, `CustomerInvoiceView` | Immutability on confirmation, valid transition `DRAFT -> CONFIRMED -> PAID / CANCELLED`, balance recalculation | `invoice.test.ts`, `invoice_pdf.test.ts` |
| **Taxes & Discounts** | `TaxRule`, `DiscountRule`, `DiscountUsage` | `GET/POST/PATCH /api/v1/taxes`<br>`GET/POST/PATCH /api/v1/discounts` | `TaxService`, `DiscountEngine` | `TaxSettingsPage`, `DiscountManagementPage` | Percentage (0-100), fixed amounts, usage limits, date ranges, stacking rules | `tax.test.ts`, `discount.test.ts` |
| **Razorpay Payments** | `Payment`, `PaymentAttempt`, `RazorpayOrder`, `WebhookEvent` | `POST /api/v1/payments/razorpay/order`<br>`POST /api/v1/payments/razorpay/verify`<br>`POST /api/v1/payments/razorpay/webhook` | `RazorpayService`, `PaymentVerificationService` | `CheckoutModal`, `InvoicePayButton`, `CustomerPaymentHistory` | HMAC-SHA256 signature verification, raw body validation, idempotency via event id | `razorpay.test.ts`, `webhook.test.ts` |
| **Manual Payments** | `Payment`, `InvoicePaymentAllocation` | `POST /api/v1/payments/manual`<br>`GET /api/v1/payments` | `PaymentService`, `ReconciliationService` | `PaymentListPage`, `RecordPaymentModal` | Staff authorization, valid payment method, cannot exceed invoice balance | `payment_manual.test.ts` |
| **Customer Portal** | (Shared customer-scoped queries) | Customer-scoped `/api/v1/portal/*` or filtered routes | `PortalService` | `PortalDashboard`, `PortalSubscriptions`, `PortalInvoices`, `PortalPayments`, `PortalProfile` | Strict ownership verification: `userId === customer.userId` | `portal_security.test.ts` |
| **Admin Analytics & Reports** | Aggregated queries | `GET /api/v1/reports/overview`<br>`GET /api/v1/reports/revenue`<br>`GET /api/v1/reports/outstanding`<br>`GET /api/v1/reports/overdue`<br>`GET /api/v1/reports/subscriptions` | `ReportingService` | `AdminDashboard`, `RevenueReportPage`, `OutstandingBalancePage` | Database SQL aggregations, date filtering, pagination, distinction between invoiced vs collected | `reporting.test.ts` |
| **Public Landing Page** | Public plans, contact submissions | `GET /api/v1/public/plans`<br>`POST /api/v1/public/contact` | `ContactService`, `PlanService` | `LandingPage` (Hero, Features, Timeline, Live Preview, Dynamic Pricing, FAQ, Contact, Footer) | Clean responsive UX, live component preview, form validation | `landing_page.test.ts` |
| **Enhancements: Simulator, Audit, Alerts, AI** | `AuditLog`, `SystemAlert` | `POST /api/v1/simulator/calculate`<br>`GET /api/v1/audit-logs`<br>`GET/PATCH /api/v1/alerts`<br>`POST /api/v1/ai/query` | `SimulatorService`, `AuditService`, `AlertService`, `AiAssistantService` | `BillingSimulatorPage`, `AuditLogsPage`, `AlertCenter`, `AiAssistantDrawer` | Read-only AI queries, simulation without persistence, audit immutability | `simulator.test.ts`, `audit.test.ts` |

---

## 2. Implementation Checklist

- [x] Step 1: Repository inspection and environment verification (Node 24, PostgreSQL 18 running).
- [ ] Step 2: Establish monorepo structure (`packages/shared`, `apps/api`, `apps/web`, `prisma/`).
- [ ] Step 3: Implement comprehensive Prisma Schema with all required entities, relations, enums, indexes, and precision numeric types.
- [ ] Step 4: Run Prisma migrations and generate Prisma client.
- [ ] Step 5: Implement `packages/shared` with shared types, Zod schemas, constants, and utilities.
- [ ] Step 6: Implement `apps/api` core foundation:
  - Configuration, logger, error handling middleware, request ID middleware, rate limiting, security headers.
  - JWT / Cookie authentication middleware with RBAC and customer ownership guards.
- [ ] Step 7: Implement backend business services and API modules:
  - Auth module (register, login, logout, password reset, me).
  - Customer & Staff module.
  - Product & Variant module (with variant adjustment calculation).
  - Plan module (with robust date arithmetic for daily, weekly, monthly, yearly).
  - Quotation Templates & Quotation module (PDF generation, confirmation).
  - Subscription module (Draft -> Quotation -> Confirmed -> Active -> Closed/Paused lifecycle).
  - Billing Engine (scheduled job, idempotency key, run records, retries).
  - Invoice module (immutability, balance tracking, PDF generation, status transitions).
  - Tax & Discount engines.
  - Razorpay payment module (order creation, signature verification, webhook processing, raw body handling).
  - Manual payment module (cash, bank transfer, UPI).
  - Reporting & analytics service (real SQL aggregations).
  - Enhancements: Billing simulator, Audit trail logger, Alert center, Read-only AI assistant.
  - Background jobs runner (node-cron / worker scheduler).
- [ ] Step 8: Build comprehensive seed script (`prisma/seed.ts`) with realistic development data for all entities.
- [ ] Step 9: Implement `apps/web` frontend:
  - Tailwind CSS design system with deep navy, indigo, teal, crisp typography, and dark/light modes.
  - Public Landing Page (Navigation, Hero, Trust, Features, How It Works, Live Product Preview, Dynamic Pricing, FAQ, Contact Form, Footer).
  - Authentication pages (Login, Register, Forgot Password, Reset Password).
  - Admin & Staff Dashboard with Recharts, KPI metrics, filterable data tables, and modal workflows.
  - Customer Self-Service Portal (Subscriptions, Invoices, Razorpay Checkout, Download PDFs, Payment History).
  - Billing Simulator UI.
  - Financial Audit Trail & Alert Center UI.
- [ ] Step 10: Implement and execute test suites:
  - Unit & Integration tests for Auth, RBAC, Calculations, Subscriptions, Billing, Invoices, Taxes, Discounts, Payments.
  - API endpoint tests using Supertest.
  - End-to-End browser workflow tests.
  - High-volume performance benchmarks (<2s response target).
- [ ] Step 11: Create complete project documentation (`README.md`, `docs/architecture.md`, `docs/database.md`, `docs/api-reference.md`, `docs/setup.md`, `docs/testing.md`, `docs/deployment.md`).
- [ ] Step 12: Production build validation, linting, and final verification.
