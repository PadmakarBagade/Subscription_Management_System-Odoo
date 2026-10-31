export const USER_ROLES = {
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
  CUSTOMER: 'CUSTOMER',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const BILLING_FREQUENCIES = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
} as const;

export type BillingFrequency = (typeof BILLING_FREQUENCIES)[keyof typeof BILLING_FREQUENCIES];

export const SUBSCRIPTION_STATUSES = {
  DRAFT: 'DRAFT',
  QUOTATION: 'QUOTATION',
  CONFIRMED: 'CONFIRMED',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  CLOSED: 'CLOSED',
} as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[keyof typeof SUBSCRIPTION_STATUSES];

export const INVOICE_STATUSES = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  PAID: 'PAID',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
  VOID: 'VOID',
} as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[keyof typeof INVOICE_STATUSES];

export const QUOTATION_STATUSES = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  CONFIRMED: 'CONFIRMED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;

export type QuotationStatus = (typeof QUOTATION_STATUSES)[keyof typeof QUOTATION_STATUSES];

export const PAYMENT_METHODS = {
  RAZORPAY: 'RAZORPAY',
  BANK_TRANSFER: 'BANK_TRANSFER',
  UPI: 'UPI',
  CASH: 'CASH',
  CHEQUE: 'CHEQUE',
  OTHER: 'OTHER',
} as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

export const PAYMENT_STATUSES = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[keyof typeof PAYMENT_STATUSES];

export const TAX_TYPES = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED: 'FIXED',
} as const;

export type TaxType = (typeof TAX_TYPES)[keyof typeof TAX_TYPES];

export const DISCOUNT_TYPES = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED_AMOUNT: 'FIXED_AMOUNT',
} as const;

export type DiscountType = (typeof DISCOUNT_TYPES)[keyof typeof DISCOUNT_TYPES];

export const PAYMENT_TERM_TYPES = {
  IMMEDIATE: 'IMMEDIATE',
  NET15: 'NET15',
  NET30: 'NET30',
  NET60: 'NET60',
} as const;

export type PaymentTermType = (typeof PAYMENT_TERM_TYPES)[keyof typeof PAYMENT_TERM_TYPES];
