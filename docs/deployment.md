# Brightloop Software — Production Deployment Guide

## 1. Production Architecture Overview
- **Frontend**: Built statically (`npm run build --workspace=@brightloop/web`) and hosted on Vercel, Netlify, or AWS CloudFront/S3.
- **Backend API**: Node.js containerized service (Docker, Render, AWS ECS, Railway, or DigitalOcean App Platform) running `node dist/server.js`.
- **Database**: Managed PostgreSQL instance (AWS RDS, Supabase, Neon, or Railway) with connection pooling.
- **Background Worker**: Managed persistent process executing node-cron scheduled tasks for recurring billing and reminders.

## 2. Environment Variables Checklist
Ensure all variables from `.env.example` are configured in your production secrets manager:
- `NODE_ENV=production`
- `DATABASE_URL=postgresql://...`
- `JWT_SECRET` (Use cryptographically random 64-char string)
- `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `WEB_APP_URL` (Your production frontend URL)
- `API_BASE_URL` (Your production backend API URL)
- `EMAIL_PROVIDER` & SMTP / API credentials

## 3. Database Migration Deployment
Before deploying new container versions, run Prisma migrations:
```bash
npx prisma migrate deploy
```

## 4. Health Checks & Monitoring
- API Health Check: `GET /health` returns `200 OK` with database status.
- Prometheus / Structured JSON logs via Pino.
