import { z } from 'zod';
import {
  USER_ROLES,
  BILLING_FREQUENCIES,
  SUBSCRIPTION_STATUSES,
  INVOICE_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  TAX_TYPES,
  DISCOUNT_TYPES,
  PAYMENT_TERM_TYPES,
} from '../constants';

// -------------------------------------------------------------
// AUTH SCHEMAS
// -------------------------------------------------------------

export const PasswordSchema = z
  .string()
  .min(9, 'Password must be more than 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const RegisterSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
    password: PasswordSchema,
    passwordConfirmation: z.string(),
    companyName: z.string().optional(),
    phone: z.string().optional(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'Passwords do not match',
    path: ['passwordConfirmation'],
  });

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: PasswordSchema,
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'Passwords do not match',
    path: ['passwordConfirmation'],
  });

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

// -------------------------------------------------------------
// CUSTOMER SCHEMAS
// -------------------------------------------------------------

export const CustomerProfileSchema = z.object({
  companyName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  billingAddress: z.string().optional().nullable(),
  shippingAddress: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  currency: z.string().default('INR'),
  notes: z.string().optional().nullable(),
});

export const CustomerCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  password: PasswordSchema.optional(),
  companyName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  billingAddress: z.string().optional().nullable(),
  shippingAddress: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  currency: z.string().default('INR'),
  notes: z.string().optional().nullable(),
});

export const CustomerUpdateSchema = CustomerCreateSchema.partial();

// -------------------------------------------------------------
// PRODUCT & VARIANT SCHEMAS
// -------------------------------------------------------------

export const ProductVariantInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Variant name is required'),
  value: z.string().min(1, 'Variant value is required'),
  priceAdjustment: z.coerce.number().default(0),
  isActive: z.boolean().default(true),
});

export const ProductCreateSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  code: z.string().min(2, 'Product code is required').toUpperCase().trim(),
  type: z.enum(['SERVICE', 'DIGITAL', 'PHYSICAL']).default('SERVICE'),
  salesPrice: z.coerce.number().min(0, 'Sales price cannot be negative'),
  costPrice: z.coerce.number().min(0, 'Cost price cannot be negative').default(0),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  variants: z.array(ProductVariantInputSchema).optional().default([]),
});

export const ProductUpdateSchema = ProductCreateSchema.partial();

// -------------------------------------------------------------
// PLAN SCHEMAS
// -------------------------------------------------------------

export const PlanProductInputSchema = z.object({
  productId: z.string().uuid('Valid product ID required'),
  defaultQuantity: z.coerce.number().int().min(1).default(1),
  isRequired: z.boolean().default(true),
});

export const PlanCreateSchema = z.object({
  name: z.string().min(2, 'Plan name is required'),
  code: z.string().min(2, 'Plan code is required').toUpperCase().trim(),
  description: z.string().optional().nullable(),
  billingFrequency: z.nativeEnum(BILLING_FREQUENCIES).default('MONTHLY'),
  basePrice: z.coerce.number().min(0, 'Base price cannot be negative'),
  minimumQuantity: z.coerce.number().int().min(1).default(1),
  availabilityStart: z.coerce.date().optional().nullable(),
  availabilityEnd: z.coerce.date().optional().nullable(),
  isActive: z.boolean().default(true),
  autoClosePolicy: z.boolean().default(false),
  allowEarlyClosure: z.boolean().default(true),
  allowPause: z.boolean().default(true),
  allowRenewal: z.boolean().default(true),
  productIds: z.array(PlanProductInputSchema).optional().default([]),
});

export const PlanUpdateSchema = PlanCreateSchema.partial();

// -------------------------------------------------------------
// QUOTATION SCHEMAS
// -------------------------------------------------------------

export const QuotationLineInputSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  quantity: z.coerce.number().int().min(1),
  unitPrice: z.coerce.number().min(0).optional(), // Can be calculated by server
  notes: z.string().optional().nullable(),
});

export const QuotationCreateSchema = z.object({
  customerId: z.string().uuid('Customer ID is required'),
  planId: z.string().uuid('Plan ID is required'),
  templateId: z.string().uuid().optional().nullable(),
  validityDays: z.coerce.number().int().min(1).default(30),
  notes: z.string().optional().nullable(),
  lines: z.array(QuotationLineInputSchema).min(1, 'At least one line item is required'),
});

export const QuotationTemplateLineInputSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  quantity: z.coerce.number().int().min(1).default(1),
  unitPrice: z.coerce.number().min(0).optional(),
});

export const QuotationTemplateCreateSchema = z.object({
  name: z.string().min(2, 'Template name is required'),
  description: z.string().optional().nullable(),
  defaultPlanId: z.string().uuid().optional().nullable(),
  validityDays: z.coerce.number().int().min(1).default(30),
  isActive: z.boolean().default(true),
  lines: z.array(QuotationTemplateLineInputSchema).optional().default([]),
});

export const QuotationTemplateUpdateSchema = QuotationTemplateCreateSchema.partial();
export type QuotationTemplateCreateInput = z.infer<typeof QuotationTemplateCreateSchema>;
export type QuotationTemplateUpdateInput = z.infer<typeof QuotationTemplateUpdateSchema>;

// -------------------------------------------------------------
// SUBSCRIPTION SCHEMAS
// -------------------------------------------------------------

export const SubscriptionLineInputSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  quantity: z.coerce.number().int().min(1),
});

export const SubscriptionCreateSchema = z.object({
  customerId: z.string().uuid('Customer ID is required'),
  planId: z.string().uuid('Plan ID is required'),
  quotationId: z.string().uuid().optional().nullable(),
  startDate: z.coerce.date().default(() => new Date()),
  billingFrequency: z.nativeEnum(BILLING_FREQUENCIES).default('MONTHLY'),
  paymentTermType: z.nativeEnum(PAYMENT_TERM_TYPES).default('IMMEDIATE'),
  autoRenew: z.boolean().default(true),
  discountCode: z.string().optional().nullable(),
  lines: z.array(SubscriptionLineInputSchema).min(1, 'At least one product line is required'),
});

export const SubscriptionActionSchema = z.object({
  action: z.enum(['CONFIRM', 'ACTIVATE', 'PAUSE', 'RESUME', 'RENEW', 'CLOSE']),
  reason: z.string().optional().nullable(),
});

// -------------------------------------------------------------
// INVOICE SCHEMAS
// -------------------------------------------------------------

export const InvoiceLineInputSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  description: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  unitPrice: z.coerce.number().min(0),
});

export const InvoiceCreateSchema = z.object({
  customerId: z.string().uuid('Customer ID is required'),
  subscriptionId: z.string().uuid().optional().nullable(),
  dueDate: z.coerce.date(),
  notes: z.string().optional().nullable(),
  lines: z.array(InvoiceLineInputSchema).min(1, 'At least one invoice line is required'),
});

// -------------------------------------------------------------
// TAX & DISCOUNT SCHEMAS
// -------------------------------------------------------------

export const TaxRuleCreateSchema = z.object({
  name: z.string().min(2, 'Tax name is required'),
  code: z.string().min(2, 'Tax code is required').toUpperCase().trim(),
  taxType: z.nativeEnum(TAX_TYPES).default('PERCENTAGE'),
  rate: z.coerce.number().min(0, 'Rate cannot be negative'),
  isGst: z.boolean().default(false),
  cgstRate: z.coerce.number().optional().nullable(),
  sgstRate: z.coerce.number().optional().nullable(),
  igstRate: z.coerce.number().optional().nullable(),
  effectiveFrom: z.coerce.date().optional().nullable(),
  effectiveTo: z.coerce.date().optional().nullable(),
  isActive: z.boolean().default(true),
  priority: z.coerce.number().int().default(1),
});

export const DiscountRuleCreateSchema = z.object({
  name: z.string().min(2, 'Discount name is required'),
  code: z.string().min(2, 'Discount code is required').toUpperCase().trim(),
  discountType: z.nativeEnum(DISCOUNT_TYPES).default('PERCENTAGE'),
  value: z.coerce.number().min(0, 'Value cannot be negative'),
  minPurchaseAmount: z.coerce.number().optional().nullable(),
  minQuantity: z.coerce.number().int().optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  usageLimit: z.coerce.number().int().optional().nullable(),
  isActive: z.boolean().default(true),
  applicableProductIds: z.array(z.string()).optional().nullable(),
});

// -------------------------------------------------------------
// PAYMENT SCHEMAS
// -------------------------------------------------------------

export const RazorpayOrderCreateSchema = z.object({
  invoiceId: z.string().uuid().optional().nullable(),
  subscriptionId: z.string().uuid().optional().nullable(),
  planId: z.string().uuid().optional().nullable(),
  notes: z.record(z.string()).optional(),
});

export const RazorpayVerifySchema = z.object({
  razorpay_order_id: z.string().min(1, 'Order ID is required'),
  razorpay_payment_id: z.string().min(1, 'Payment ID is required'),
  razorpay_signature: z.string().min(1, 'Signature is required'),
  invoiceId: z.string().uuid().optional().nullable(),
  subscriptionId: z.string().uuid().optional().nullable(),
});

export const ManualPaymentCreateSchema = z.object({
  invoiceId: z.string().uuid('Invoice ID is required'),
  amount: z.coerce.number().positive('Payment amount must be greater than zero'),
  paymentMethod: z.enum(['BANK_TRANSFER', 'UPI', 'CASH', 'CHEQUE', 'OTHER']),
  paymentDate: z.coerce.date().default(() => new Date()),
  referenceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// -------------------------------------------------------------
// SIMULATOR SCHEMA
// -------------------------------------------------------------

export const SimulatorCalculateSchema = z.object({
  planId: z.string().uuid().optional().nullable(),
  billingFrequency: z.nativeEnum(BILLING_FREQUENCIES).default('MONTHLY'),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      variantId: z.string().uuid().optional().nullable(),
      quantity: z.coerce.number().int().min(1).default(1),
    })
  ),
  discountCode: z.string().optional().nullable(),
  taxRuleIds: z.array(z.string()).optional().nullable(),
});

// -------------------------------------------------------------
// CONTACT FORM SCHEMA
// -------------------------------------------------------------

export const ContactFormSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required').toLowerCase().trim(),
  company: z.string().optional().nullable(),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});
