import { z } from 'zod';
import {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  CustomerProfileSchema,
  CustomerCreateSchema,
  CustomerUpdateSchema,
  ProductCreateSchema,
  ProductUpdateSchema,
  ProductVariantInputSchema,
  PlanCreateSchema,
  PlanUpdateSchema,
  QuotationCreateSchema,
  SubscriptionCreateSchema,
  SubscriptionActionSchema,
  InvoiceCreateSchema,
  TaxRuleCreateSchema,
  DiscountRuleCreateSchema,
  RazorpayOrderCreateSchema,
  RazorpayVerifySchema,
  ManualPaymentCreateSchema,
  SimulatorCalculateSchema,
  ContactFormSchema,
} from '../schemas';
import { UserRole } from '../constants';

export * from '../constants';
export * from '../schemas';

export type RegisterPayload = z.infer<typeof RegisterSchema>;
export type LoginPayload = z.infer<typeof LoginSchema>;
export type ForgotPasswordPayload = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordPayload = z.infer<typeof ResetPasswordSchema>;

export type CustomerProfilePayload = z.infer<typeof CustomerProfileSchema>;
export type CustomerCreatePayload = z.infer<typeof CustomerCreateSchema>;
export type CustomerUpdatePayload = z.infer<typeof CustomerUpdateSchema>;

export type ProductCreatePayload = z.infer<typeof ProductCreateSchema>;
export type ProductUpdatePayload = z.infer<typeof ProductUpdateSchema>;
export type ProductVariantInput = z.infer<typeof ProductVariantInputSchema>;

export type PlanCreatePayload = z.infer<typeof PlanCreateSchema>;
export type PlanUpdatePayload = z.infer<typeof PlanUpdateSchema>;

export type QuotationCreatePayload = z.infer<typeof QuotationCreateSchema>;
export type SubscriptionCreatePayload = z.infer<typeof SubscriptionCreateSchema>;
export type SubscriptionActionPayload = z.infer<typeof SubscriptionActionSchema>;

export type InvoiceCreatePayload = z.infer<typeof InvoiceCreateSchema>;

export type TaxRuleCreatePayload = z.infer<typeof TaxRuleCreateSchema>;
export type DiscountRuleCreatePayload = z.infer<typeof DiscountRuleCreateSchema>;

export type RazorpayOrderCreatePayload = z.infer<typeof RazorpayOrderCreateSchema>;
export type RazorpayVerifyPayload = z.infer<typeof RazorpayVerifySchema>;
export type ManualPaymentCreatePayload = z.infer<typeof ManualPaymentCreateSchema>;

export type SimulatorCalculatePayload = z.infer<typeof SimulatorCalculateSchema>;
export type ContactFormPayload = z.infer<typeof ContactFormSchema>;

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  customerId?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}
