import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';

import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { prisma } from './utils/prisma';

// Route imports
import authRoutes from './routes/auth.routes';
import customerRoutes from './routes/customer.routes';
import productRoutes from './routes/product.routes';
import planRoutes from './routes/plan.routes';
import quotationRoutes from './routes/quotation.routes';
import subscriptionRoutes from './routes/subscription.routes';
import invoiceRoutes from './routes/invoice.routes';
import paymentRoutes from './routes/payment.routes';
import billingRoutes from './routes/billing.routes';
import taxRoutes from './routes/tax.routes';
import discountRoutes from './routes/discount.routes';
import reportRoutes from './routes/report.routes';
import simulatorRoutes from './routes/simulator.routes';
import auditRoutes from './routes/audit.routes';
import alertRoutes from './routes/alert.routes';
import aiRoutes from './routes/ai.routes';
import publicRoutes from './routes/public.routes';
import userRoutes from './routes/user.routes';
import quotationTemplateRoutes from './routes/quotation-template.routes';

export const app = express();

// Security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: [config.webAppUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);

// Capture raw body for webhook verification before JSON parsing
app.use(
  express.json({
    verify: (req: Request, _res: Response, buf: Buffer) => {
      (req as any).rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(config.jwt.cookieSecret));

// Request ID and logger middleware
app.use((req: Request, res: Response, next) => {
  req.requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
});

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'UP',
      database: 'connected',
      environment: config.env,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'DOWN',
      database: 'disconnected',
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Mount API v1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/plans', planRoutes);
app.use('/api/v1/quotations', quotationRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/taxes', taxRoutes);
app.use('/api/v1/discounts', discountRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/simulator', simulatorRoutes);
app.use('/api/v1/audit-logs', auditRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/public', publicRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/quotation-templates', quotationTemplateRoutes);

// Centralized error handling
app.use(errorHandler);
