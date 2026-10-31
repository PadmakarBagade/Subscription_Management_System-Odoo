import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/utils/prisma';

describe('Authentication and RBAC API Suite', () => {
  let adminToken: string;
  let customer1Token: string;
  let customer1Id: string;
  let customer2Token: string;
  let customer2Id: string;

  beforeAll(async () => {
    // 1. Log in as admin (seeded)
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@brightloop.com',
        password: 'Admin@Brightloop2026!',
      });
    adminToken = adminRes.body.data.token;

    // 2. Log in as seeded customer 1
    const cust1Res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'john.doe@example.com',
        password: 'Customer@Brightloop2026!',
      });
    customer1Token = cust1Res.body.data.token;
    customer1Id = cust1Res.body.data.user.customerId;

    // 3. Log in as seeded customer 2
    const cust2Res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'jane.smith@example.com',
        password: 'Customer@Brightloop2026!',
      });
    customer2Token = cust2Res.body.data.token;
    customer2Id = cust2Res.body.data.user.customerId;
  });

  describe('Registration & Password Complexity', () => {
    it('should reject registration if password does not meet complexity requirements', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Weak Password User',
          email: 'weak@example.com',
          password: 'password', // Missing uppercase, number, special char
          passwordConfirmation: 'password',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject registration if password is 8 characters or fewer (must be more than eight characters)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Eight Char User',
          email: 'eightchar@example.com',
          password: 'Abc!1234', // Exactly 8 characters with upper, lower, number, special
          passwordConfirmation: 'Abc!1234',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.password).toBeDefined();
    });

    it('should reject registration if passwords do not match', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Mismatch User',
          email: 'mismatch@example.com',
          password: 'ValidPassword123!',
          passwordConfirmation: 'DifferentPassword123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.passwordConfirmation).toBeDefined();
    });

    it('should register a valid customer and return token', async () => {
      const testEmail = `newcustomer_${Date.now()}@example.com`;
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Brand New Customer',
          email: testEmail,
          password: 'SecurePassword2026!',
          passwordConfirmation: 'SecurePassword2026!',
          companyName: 'Horizon Corp',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('CUSTOMER');
    });

    it('should reject duplicate email registration with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Duplicate John',
          email: 'john.doe@example.com',
          password: 'SecurePassword2026!',
          passwordConfirmation: 'SecurePassword2026!',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Login & Session', () => {
    it('should reject invalid password with 401', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@brightloop.com',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should successfully authenticate with GET /me', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('john.doe@example.com');
      expect(res.body.data.user.role).toBe('CUSTOMER');
    });

    it('should reject unauthenticated requests to protected routes', async () => {
      const res = await request(app).get('/api/v1/customers');
      expect(res.status).toBe(401);
    });
  });

  describe('RBAC & Customer Data Isolation', () => {
    it('should prevent CUSTOMER from accessing admin customer list', async () => {
      const res = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(403);
    });

    it('should allow ADMIN to access customer list', async () => {
      const res = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should allow Customer 1 to view their own customer profile', async () => {
      const res = await request(app)
        .get(`/api/v1/customers/${customer1Id}`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(customer1Id);
    });

    it('should DENY Customer 1 attempting to view Customer 2 profile (ownership isolation)', async () => {
      const res = await request(app)
        .get(`/api/v1/customers/${customer2Id}`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Forbidden');
    });
  });
});
