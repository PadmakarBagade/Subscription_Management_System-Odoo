import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env or local .env
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config(); // fallback

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:4000',
  webAppUrl: process.env.WEB_APP_URL || 'http://localhost:5173',

  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/brightloop_subscriptions?schema=public',

  jwt: {
    secret: process.env.JWT_SECRET || 'brightloop_default_jwt_secret_change_in_production_32chars',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    cookieSecret: process.env.COOKIE_SECRET || 'brightloop_cookie_signing_secret_32_chars_long',
  },

  passwordReset: {
    secret: process.env.PASSWORD_RESET_SECRET || 'brightloop_password_reset_token_secret_2026',
    expiresMinutes: parseInt(process.env.PASSWORD_RESET_EXPIRES_MINUTES || '60', 10),
  },

  email: {
    provider: process.env.EMAIL_PROVIDER || 'log',
    from: process.env.EMAIL_FROM || 'Brightloop Software <billing@brightloopsoftware.local>',
    smtp: {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '2525', 10),
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT || '587', 10) === 465,
    },
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key_id',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret_key_never_expose',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'placeholder_webhook_secret_key',
  },

  ai: {
    apiKey: process.env.AI_PROVIDER_API_KEY || '',
  },

  company: {
    name: process.env.COMPANY_NAME || 'Brightloop Software Pvt Ltd',
    email: process.env.COMPANY_EMAIL || 'billing@brightloopsoftware.com',
    phone: process.env.COMPANY_PHONE || '+91 80 4000 1234',
    address: process.env.COMPANY_ADDRESS || 'Plot 42, Tech Park, Outer Ring Road, Bengaluru, KA 560103, India',
    gstin: process.env.COMPANY_GSTIN || '29ABCDE1234F1Z5',
    website: process.env.COMPANY_WEBSITE || 'https://brightloopsoftware.com',
    currency: process.env.COMPANY_CURRENCY || 'INR',
    currencySymbol: process.env.COMPANY_CURRENCY_SYMBOL || '₹',
  },

  jobs: {
    billingCron: process.env.BILLING_JOB_CRON || '0 0 * * *',
    reminderCron: process.env.REMINDER_JOB_CRON || '0 6 * * *',
    reconciliationCron: process.env.RECONCILIATION_JOB_CRON || '0 */6 * * *',
    enabled: process.env.ENABLE_BACKGROUND_JOBS !== 'false',
  },
};
