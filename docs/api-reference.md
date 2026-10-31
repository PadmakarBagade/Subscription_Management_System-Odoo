# Brightloop Software — REST API Reference (v1)

All endpoints use JSON payloads and return a consistent response envelope:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "meta": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 }
}
```

Error responses return:
```json
{
  "success": false,
  "error": "Error message",
  "errors": { "field": ["validation message"] }
}
```

---

## 1. Authentication (`/api/v1/auth`)
- `POST /register`: Register a new customer account.
- `POST /login`: Log in with email & password, returns JWT in cookie & JSON.
- `POST /logout`: Clear session cookie.
- `POST /forgot-password`: Request password reset email / token.
- `POST /reset-password`: Reset password using one-time token.
- `GET /me`: Get authenticated user profile and roles.

## 2. Customer Management (`/api/v1/customers`)
- `GET /`: List customers (Search, filter, pagination) [ADMIN, STAFF].
- `POST /`: Create customer account [ADMIN, STAFF].
- `GET /:id`: Get customer details and billing profile.
- `PATCH /:id`: Update customer details.

## 3. Products & Variants (`/api/v1/products`)
- `GET /`: List active products with variants.
- `POST /`: Create product with variants [ADMIN].
- `GET /:id`: Product details.
- `PATCH /:id`: Update product or variants [ADMIN].
- `DELETE /:id`: Deactivate or archive product [ADMIN].

## 4. Subscription Plans (`/api/v1/plans`)
- `GET /`: List subscription plans (Public or Admin view).
- `POST /`: Create plan [ADMIN].
- `GET /:id`: Plan details.
- `PATCH /:id`: Update plan [ADMIN].

## 5. Quotations (`/api/v1/quotations`)
- `GET /`: List quotations.
- `POST /`: Generate quotation from template or custom lines.
- `GET /:id`: Get quotation details.
- `POST /:id/confirm`: Convert quotation to subscription.
- `GET /:id/pdf`: Download quotation PDF.

## 6. Subscriptions (`/api/v1/subscriptions`)
- `GET /`: List subscriptions (Customer filtered to own).
- `POST /`: Create subscription.
- `GET /:id`: Subscription details, line items, and invoice history.
- `POST /:id/pause`: Pause active subscription.
- `POST /:id/resume`: Resume paused subscription.
- `POST /:id/renew`: Renew subscription.
- `POST /:id/cancel`: Cancel subscription with reason.

## 7. Invoices (`/api/v1/invoices`)
- `GET /`: List invoices (Customer filtered to own).
- `POST /`: Create draft invoice [ADMIN, STAFF].
- `GET /:id`: Invoice breakdown and line items.
- `POST /:id/confirm`: Confirm invoice (locks financial values).
- `POST /:id/cancel`: Cancel unpaid invoice [ADMIN].
- `GET /:id/pdf`: Generate and download official PDF invoice.

## 8. Payments (`/api/v1/payments`)
- `POST /razorpay/order`: Create Razorpay checkout order for invoice or subscription.
- `POST /razorpay/verify`: Verify HMAC payment signature and apply payment.
- `POST /razorpay/webhook`: Secure webhook ingestion for asynchronous payment events.
- `POST /manual`: Record offline manual payment (bank transfer, cash, etc.) [ADMIN, STAFF].
- `GET /`: List recorded payments.

## 9. Recurring Billing Engine (`/api/v1/billing`)
- `POST /trigger`: Execute manual billing run [ADMIN].
- `GET /runs`: List billing run history and stats [ADMIN].
- `GET /runs/:id`: Get billing run detailed item logs [ADMIN].

## 10. Financial Reporting & Analytics (`/api/v1/reports`)
- `GET /overview`: High-level KPIs (Total revenue, active subs, collections, overdue).
- `GET /revenue`: Monthly revenue trends and plan distributions.
- `GET /outstanding`: Outstanding customer balances.
- `GET /subscriptions`: Subscription churn, retention, and growth metrics.

## 11. Extensions & Utilities
- `POST /simulator/calculate`: Test billing scenarios without database persistence.
- `GET /audit-logs`: Query tamper-evident audit history.
- `GET /alerts`: Notification center alerts (overdue, renewals, failed jobs).
- `PATCH /alerts/:id/review`: Acknowledge an alert.
- `POST /ai/query`: Read-only AI financial assistant queries.
- `POST /public/contact`: Contact form inquiries from landing page.
