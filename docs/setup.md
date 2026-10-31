# Brightloop Software — Setup & Installation Guide

## 1. Prerequisites
- **Node.js**: v20+ (tested on v24.22)
- **PostgreSQL**: v14+ (tested on v18.0)
- **Package Manager**: npm 10+
- **Git**

## 2. Quickstart Step-by-Step

### Step 1: Clone & Install Dependencies
```bash
git clone <repository_url>
cd Subscription_Management_System
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your `DATABASE_URL` matches your local PostgreSQL instance:
```env
DATABASE_URL="postgresql://postgres:admin@localhost:5432/brightloop_subscriptions?schema=public"
TEST_DATABASE_URL="postgresql://postgres:admin@localhost:5432/brightloop_subscriptions_test?schema=public"
```

### Step 3: Run Database Migrations & Client Generation
```bash
npm run prisma:generate
npm run prisma:push
```

### Step 4: Seed Database with Initial Data
The seed script populates default admin credentials, staff accounts, sample customers, products, variants, subscription plans, taxes, discounts, active subscriptions, and invoices.
```bash
npm run prisma:seed
```

### Step 5: Start the Development Server
```bash
npm run dev
```
- Web Application: `http://localhost:5173`
- API Server: `http://localhost:4000`

### Default Development Credentials
- **Admin**: `admin@brightloop.com` / `Admin@Brightloop2026!`
- **Staff**: `staff@brightloop.com` / `Staff@Brightloop2026!`
- **Customer**: `john.doe@example.com` / `Customer@Brightloop2026!`

*(Note: In production environments, run the admin bootstrap command to set unique initial administrator credentials).*
