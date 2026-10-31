# Brightloop Software — Testing Documentation

## 1. Testing Philosophy & Strategy
Automated testing is built into the architecture from day one. Tests are structured across multiple layers:
1. **Unit & Calculation Tests**: Date arithmetic, variant pricing, tax & discount stacking, and Razorpay HMAC signature validation.
2. **Integration & API Tests**: Supertest HTTP execution against isolated PostgreSQL test database testing all authentication, RBAC, ownership checks, and status state machines.
3. **End-to-End Workflow Tests**: Playwright browser automation simulating complete user journeys from registration to plan purchase and invoice payment.
4. **Stress & Performance Tests**: Database aggregation performance verification over thousands of subscription and invoice records to ensure <2s response times.

## 2. Test Execution Commands

```bash
# Run all unit and integration tests across workspaces
npm run test

# Run API test suite only
npm run test:api

# Run Frontend component tests
npm run test:web

# Run End-to-End Browser Journeys
npm run test:e2e
```

## 3. Mandatory Workflow Coverage
- **Authentication**: Registration, duplicate prevention, password complexity, login, token refresh, logout, password reset flow.
- **RBAC & Ownership Security**:
  - Admin access validation across all resources.
  - Staff restrictions (prevent staff creation, prevent system setting modifications).
  - Customer data isolation (Customer A cannot access Customer B's invoices or subscriptions).
- **Subscriptions & Billing**:
  - Valid lifecycle transitions: `DRAFT -> QUOTATION -> CONFIRMED -> ACTIVE -> CLOSED`.
  - Pause and resume operations.
  - Idempotent recurring billing engine (running job twice does not duplicate invoices).
- **Payment Verification**:
  - Valid Razorpay webhook processing with HMAC signature.
  - Rejecting tampered payment signatures or invalid order IDs.
  - Invoice balance reconciliation and transition to `PAID`.
