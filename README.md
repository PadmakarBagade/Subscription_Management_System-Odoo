# Brightloop Software — Subscription Management & Billing Platform

[![Build Status](https://img.shields.io/badge/Build-Passing-emerald.svg)]()
[![Tests](https://img.shields.io/badge/Tests-35%2F35%20Passing-brightgreen.svg)]()
[![Architecture](https://img.shields.io/badge/Monorepo-npm%20workspaces-blue.svg)]()
[![Database](https://img.shields.io/badge/PostgreSQL-18-blue.svg)]()
[![ORM](https://img.shields.io/badge/Prisma-6.19.3-indigo.svg)]()
[![Frontend](https://img.shields.io/badge/React%2018-Vite%206-cyan.svg)]()

> A production-grade, end-to-end Subscription Management and Automated Billing platform designed for modern SaaS companies. Built with a unified TypeScript monorepo, robust PostgreSQL database architecture, automated recurring billing engine with idempotency guarantees, Razorpay online payments & offline reconciliations, server-side PDF invoice rendering, and role-based access control.

---

## 🌟 Key Features

### 1. Robust Date Arithmetic & Zero-Drift Scheduling
- **Month-End Pinning:** Intelligently handles calendar discrepancies (e.g. Jan 31st renews on Feb 28th/29th, then returns to March 31st).
- **Leap Year Preservation:** Feb 29th annual subscriptions automatically pin to Feb 28th on common years and restore to Feb 29th on leap years.
- **Configurable Cadences:** Full support for `MONTHLY`, `QUARTERLY` (3 months), `SEMI_ANNUAL` (6 months), and `ANNUAL` (12 months) cycles.

### 2. Automated Recurring Billing Engine
- **Strict Idempotency:** Enforced at the database constraint level on `(subscriptionId, billingPeriodStart)` to prevent duplicate invoice generation under all circumstances.
- **Execution Auditing:** Every billing run logs evaluated subscriptions, invoices created, skips, failures, and execution duration.
- **Dual Invocation:** Runs automatically via background CRON schedule (`0 0 * * *`) or can be triggered on-demand via the Admin Workspace.

### 3. Comprehensive Payment & Reconciliation Engine
- **Razorpay Integration:** Order creation, official browser checkout popup integration, and cryptographic HMAC-SHA256 signature verification.
- **Webhook Deduplication:** Idempotent event processing with raw payload storage in `WebhookEvent`.
- **Manual Offline Payments:** Authorized staff workflow for recording Cash, Bank Transfer (NEFT/RTGS), UPI, and Cheque settlements with balance recalculation and invoice status transitions (`DRAFT` &rarr; `CONFIRMED` &rarr; `PARTIALLY_PAID` &rarr; `PAID`).

### 4. Enterprise Compliance, Taxes & Discounts
- **GST Compliance:** Automated intra-state decomposition into 50% CGST + 50% SGST, or inter-state IGST.
- **Coupon Vouchers & Discounts:** Flexible percentage or fixed-amount discounts with usage limits, minimum purchase thresholds, and validity windows.
- **Server-Side PDF Generation:** High-resolution PDF invoices generated on-the-fly using PDFKit.

### 5. Multi-Persona Experiences
- **Public Marketing & Landing Page:** Interactive live component previews, dynamic pricing tiers from the database, interactive FAQ accordion, and contact forms.
- **Customer Self-Service Portal:** Customers can view active contracts, download official tax invoice PDFs, execute online payments, and update corporate billing details.
- **Admin & Staff Workspace:** Full command center with KPI stat cards, Recharts visualizations, lifecycle transitions (pause, resume, renew, cancel), tax/discount configuration, audit trails, and an AI Revenue Assistant drawer.

---

## 🏛️ System Architecture

```
d:\Odoo X Flux\Subscription_Management_System\
├── apps/
│   ├── api/                 # Express.js REST API with TypeScript & Prisma
│   │   ├── src/
│   │   │   ├── config/      # Environment & application configuration
│   │   │   ├── jobs/        # Background CRON scheduler
│   │   │   ├── middleware/  # JWT Auth, RBAC, Rate Limiting, Error Handling
│   │   │   ├── routes/      # 17 versioned REST API routes (/api/v1/*)
│   │   │   ├── services/    # BillingEngine, Pricing, Tax, Discount, Razorpay, PDF, AI
│   │   │   └── utils/       # Date arithmetic, Logger (Pino), Prisma singleton
│   │   └── tests/           # 5 comprehensive Vitest integration test suites
│   └── web/                 # React 18 SPA with Vite 6 & Tailwind CSS
│       ├── src/
│       │   ├── components/  # Layouts, common UI components, AI Assistant drawer
│       │   ├── context/     # AuthContext with token & role management
│       │   ├── pages/       # Public landing, Customer Portal, Admin Workspace
│       │   └── services/    # API client & Razorpay checkout launcher
├── packages/
│   └── shared/              # Shared Zod validation schemas, TypeScript types, constants
├── prisma/
│   ├── schema.prisma        # 33 models, enums, unique constraints, and indexes
│   └── seed.ts              # Realistic database seeding script
└── docs/                    # Architecture, database schema, API reference, deployment docs
```

---

## 🚀 Quick Start & Setup

### Prerequisites
- **Node.js**: v20+ LTS
- **npm**: v10+
- **PostgreSQL**: v16+ (Local or Remote)

### 1. Environment Configuration
Copy `.env.example` to `.env` in the root directory:
```bash
cp .env.example .env
```

Ensure the database connection string and Razorpay credentials are set:
```ini
DATABASE_URL="postgresql://postgres:admin@localhost:5432/brightloop_subscriptions?schema=public"
TEST_DATABASE_URL="postgresql://postgres:admin@localhost:5432/brightloop_subscriptions_test?schema=public"
JWT_SECRET="brightloop-super-secure-production-jwt-secret-key-32chars"
PORT=4000
WEB_APP_URL="http://localhost:5173"
RAZORPAY_KEY_ID="rzp_test_mock_brightloop_key"
RAZORPAY_KEY_SECRET="mock_brightloop_secret_key_123456"
```

### 2. Install Dependencies & Build Shared Package
```bash
npm install
npm run build --workspace=@brightloop/shared
```

### 3. Database Migration & Realistic Seeding
Push the schema to PostgreSQL and populate realistic products, variants, subscription plans, tax rules, and active accounts:
```bash
# Push schema to development database
npx prisma db push

# Run the database seeder
npm run db:seed --workspace=@brightloop/api
```

### 4. Running the Applications
You can run the entire platform concurrently from the root directory:

```bash
# Terminal 1: Start Backend API (Port 4000)
npm run dev --workspace=@brightloop/api

# Terminal 2: Start Frontend Web App (Port 5173)
npm run dev --workspace=@brightloop/web
```

- **Frontend Application:** [http://localhost:5173](http://localhost:5173)
- **Backend Health Check:** [http://localhost:4000/health](http://localhost:4000/health)
- **API Base Endpoint:** `http://localhost:4000/api/v1`

---

## 🔑 Default Credentials

| Persona | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@brightloop.com` | `Admin@123456` | Full Admin Workspace (`/admin/*`), Billing Engine, System Configuration |
| **Operations Staff** | `staff@brightloop.com` | `Staff@123456` | Operations, Quotations, Invoices, Offline Payments |
| **Enterprise Customer** | `john.doe@example.com` | `Customer@123456` | Customer Portal (`/portal/*`), Acme Corp Subscriptions & Invoices |
| **SMB Customer** | `jane.smith@example.com` | `Customer@123456` | Customer Portal (`/portal/*`), Nexus Tech Subscriptions & Invoices |

---

## 🧪 Automated Test Suite

The backend includes a comprehensive Vitest test suite executing against a dedicated test database (`brightloop_subscriptions_test`):

```bash
npm run test --workspace=@brightloop/api
```

### Test Coverage Highlights:
- **`date_arithmetic.test.ts`**: Verifies 31st month-end transitions, Feb 28th/29th leap year calculations, quarterly intervals, and annual pin dates.
- **`pricing_and_discounts.test.ts`**: Verifies product tiered pricing, volume discounts, percentage coupons, minimum purchase thresholds, and combined GST tax rates.
- **`billing_and_idempotency.test.ts`**: Verifies the recurring billing cycle, idempotency locks, skips for subscriptions not yet due, and prevents double-invoicing.
- **`payments_and_reconciliation.test.ts`**: Verifies manual offline payment recording, allocation to invoice lines, balance reductions, and invoice status transitions to `PAID`.
- **`auth_and_rbac.test.ts`**: Verifies JWT issuance, password hashing, role-based route guard enforcement (`ADMIN`, `STAFF`, `CUSTOMER`), and data isolation.

**Results:** `5/5 test files passed`, `35/35 tests passing (100%)`.

---

## 📊 API Reference Summary

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Authenticate user & issue JWT | Public |
| `GET` | `/api/v1/auth/me` | Fetch authenticated session profile | Authenticated |
| `GET` | `/api/v1/public/plans` | Fetch public active subscription tiers | Public |
| `GET` | `/api/v1/subscriptions` | List subscriptions (scoped for customers) | Authenticated |
| `POST` | `/api/v1/subscriptions/:id/pause` | Pause active subscription | Admin, Staff |
| `POST` | `/api/v1/subscriptions/:id/resume` | Resume paused subscription | Admin, Staff |
| `GET` | `/api/v1/invoices` | List invoices with status & balance | Authenticated |
| `POST` | `/api/v1/invoices` | Create draft invoice with itemized lines | Admin, Staff |
| `POST` | `/api/v1/invoices/:id/confirm` | Confirm invoice & lock calculations | Admin, Staff |
| `GET` | `/api/v1/invoices/:id/pdf` | Download official server-rendered PDF | Authenticated |
| `POST` | `/api/v1/payments/razorpay/order` | Initialize Razorpay payment order | Authenticated |
| `POST` | `/api/v1/payments/razorpay/verify` | Verify cryptographic checkout signature | Authenticated |
| `POST` | `/api/v1/payments/manual` | Record offline bank transfer / cash | Admin, Staff |
| `POST` | `/api/v1/billing/trigger` | Trigger automated recurring billing run | Admin |
| `GET` | `/api/v1/billing/runs` | List historical billing engine runs | Admin |
| `POST` | `/api/v1/simulator/calculate` | Run real-time billing simulation | Authenticated |
| `GET` | `/api/v1/reports/overview` | Fetch high-level executive KPI metrics | Admin, Staff |
| `POST` | `/api/v1/ai/query` | Ask natural language financial AI assistant | Admin, Staff |

---

## 🛡️ Production Deployment

See detailed deployment strategies in [`docs/deployment.md`](./docs/deployment.md).

```bash
# Build all workspaces
npm run build --workspaces

# Run Prisma migrations in production
npx prisma migrate deploy

# Start API production process
NODE_ENV=production node apps/api/dist/server.js
```

---

## 📄 License
Proprietary & Confidential. Copyright © 2026 Brightloop Software. All rights reserved.
