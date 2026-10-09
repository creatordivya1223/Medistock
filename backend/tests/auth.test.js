const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const env = require('../src/config/env');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');

jest.setTimeout(30000);

describe('Phase 3: Authentication & Seeding Checkpoint', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  let validToken;

  it('1. Admin login succeeds with correct credentials and returns token and user without password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: env.ADMIN_EMAIL,
        password: env.ADMIN_PASSWORD,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data).toHaveProperty('user');
    expect(res.body.data.user.email).toBe(env.ADMIN_EMAIL.toLowerCase());
    expect(res.body.data.user.role).toBe('admin');
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.data.user).toHaveProperty('id');

    validToken = res.body.data.token;
  });

  it('2. Wrong password returns generic error "Invalid email or password" (HTTP 401)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: env.ADMIN_EMAIL,
        password: 'IncorrectPassword123!',
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('3. Non-existent email returns generic error "Invalid email or password" (HTTP 401)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@medistock.com',
        password: 'SomePassword123!',
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('4. GET /api/auth/me returns 200 and the current user profile with valid Bearer token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(env.ADMIN_EMAIL.toLowerCase());
    expect(res.body.data.user.role).toBe('admin');
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('5. GET /api/auth/me returns 401 without Authorization header', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not logged in/i);
  });

  it('6. GET /api/auth/me returns 401 with a tampered or invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.tampered.token');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid token/i);
  });

  it('7. The 6th rapid login attempt from the same IP is rate limited (HTTP 429)', async () => {
    // Note: We already made 3 attempts above from this IP (supertest defaults to 127.0.0.1)
    // Attempt 4
    await request(app).post('/api/auth/login').send({
      email: env.ADMIN_EMAIL,
      password: 'wrong',
    });

    // Attempt 5
    await request(app).post('/api/auth/login').send({
      email: env.ADMIN_EMAIL,
      password: 'wrong',
    });

    // Attempt 6: Exceeds the max 5 limit
    const res6 = await request(app).post('/api/auth/login').send({
      email: env.ADMIN_EMAIL,
      password: 'wrong',
    });

    expect(res6.statusCode).toBe(429);
    expect(res6.body.success).toBe(false);
    expect(res6.body.message).toMatch(/too many login attempts/i);
  });

  it('8. Locks account after 5 failed password attempts and rejects subsequent attempts', async () => {
    // Create dedicated test user for lockout
    const lockoutEmail = 'lockout-test@medistock.com';
    await User.deleteMany({ email: lockoutEmail });
    const user = await User.create({
      name: 'Lockout Tester',
      email: lockoutEmail,
      password: 'OriginalPassword123!',
      role: 'staff',
    });

    // Directly test the controller login logic without hitting IP rate limiter
    const { login } = require('../src/controllers/authController');

    const fakeReq = (email, password) => ({
      body: { email, password },
    });
    const fakeRes = {
      status: () => fakeRes,
      json: () => fakeRes,
    };

    // Wrap asyncHandler middleware in a Promise for direct controller unit testing
    const callLogin = (email, password) => {
      return new Promise((resolve, reject) => {
        login(fakeReq(email, password), fakeRes, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    };

    // 4 failed attempts
    for (let i = 0; i < 4; i++) {
      await expect(callLogin(lockoutEmail, 'wrongPassword!')).rejects.toThrow('Invalid email or password');
    }

    // 5th failed attempt triggers lockout
    await expect(callLogin(lockoutEmail, 'wrongPassword!')).rejects.toThrow('Invalid email or password');

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.lockUntil).not.toBeNull();
    expect(new Date(updatedUser.lockUntil).getTime()).toBeGreaterThan(Date.now());

    // 6th attempt while locked fails with lockout message
    await expect(callLogin(lockoutEmail, 'OriginalPassword123!')).rejects.toThrow(
      /Account is temporarily locked/i
    );

    await User.deleteMany({ email: lockoutEmail });
  });

  it('9. authorize middleware blocks non-permitted roles with 403', () => {
    const { authorize } = require('../src/middleware/auth');
    const adminOnly = authorize('admin');

    const req = { user: { role: 'staff' } };
    let capturedError;
    const next = (err) => {
      capturedError = err;
    };

    adminOnly(req, {}, next);
    expect(capturedError).toBeDefined();
    expect(capturedError.statusCode).toBe(403);
    expect(capturedError.message).toMatch(/do not have permission/i);
  });
});
