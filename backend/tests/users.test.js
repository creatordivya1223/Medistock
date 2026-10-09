const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const env = require('../src/config/env');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const { signToken } = require('../src/utils/token');

jest.setTimeout(30000);

describe('Phase 5: User Management & Password Lifecycle Checkpoint', () => {
  let adminUser;
  let staffUser;
  let adminToken;
  let staffToken;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }

    // Clean up test users
    await User.deleteMany({
      email: {
        $in: [
          'staff-phase5@medistock.com',
          'admin-phase5@medistock.com',
          'newstaff@medistock.com',
          'resetuser@medistock.com',
        ],
      },
    });

    // Create Admin
    adminUser = await User.create({
      name: 'Admin Phase5',
      email: 'admin-phase5@medistock.com',
      password: 'AdminPassword123!',
      role: 'admin',
    });
    adminToken = signToken(adminUser._id.toString(), adminUser.role);

    // Create Staff
    staffUser = await User.create({
      name: 'Staff Phase5',
      email: 'staff-phase5@medistock.com',
      password: 'StaffPassword123!',
      role: 'staff',
    });
    staffToken = signToken(staffUser._id.toString(), staffUser.role);
  });

  afterAll(async () => {
    await User.deleteMany({
      email: {
        $in: [
          'staff-phase5@medistock.com',
          'admin-phase5@medistock.com',
          'newstaff@medistock.com',
          'resetuser@medistock.com',
        ],
      },
    });

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('1. RBAC Guard: Staff gets 403 on every /api/users route', () => {
    it('GET /api/users returns 403 for staff', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/do not have permission/i);
    });

    it('POST /api/users returns 403 for staff', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Staff Hacker',
          email: 'hacker@medistock.com',
          password: 'Password123!',
          role: 'admin',
        });
      expect(res.statusCode).toBe(403);
    });

    it('PATCH /api/users/:id returns 403 for staff', async () => {
      const res = await request(app)
        .patch(`/api/users/${staffUser._id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ name: 'Renamed Staff' });
      expect(res.statusCode).toBe(403);
    });

    it('PATCH /api/users/:id/password returns 403 for staff', async () => {
      const res = await request(app)
        .patch(`/api/users/${staffUser._id}/password`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ password: 'NewPassword123!' });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('2. User Creation & Password Policy Enforcement', () => {
    it('Rejects weak passwords (missing uppercase, number, or too short) with 400', async () => {
      // Missing uppercase
      const resNoUpper = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Weak Pass',
          email: 'weak1@medistock.com',
          password: 'password123',
        });
      expect(resNoUpper.statusCode).toBe(400);
      expect(resNoUpper.body.errors.some((e) => e.field === 'password')).toBe(true);

      // Missing number
      const resNoNum = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Weak Pass',
          email: 'weak2@medistock.com',
          password: 'PasswordOnly',
        });
      expect(resNoNum.statusCode).toBe(400);

      // Too short (<8 chars)
      const resShort = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Weak Pass',
          email: 'weak3@medistock.com',
          password: 'Pass1',
        });
      expect(resShort.statusCode).toBe(400);
    });

    it('Admin creates staff account with valid password; newly created staff can log in', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Staff Member',
          email: 'newstaff@medistock.com',
          password: 'ValidPassword123!',
          role: 'staff',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('newstaff@medistock.com');
      expect(res.body.data.password).toBeUndefined();

      // Verify that this new staff user can log in
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'newstaff@medistock.com',
          password: 'ValidPassword123!',
        });

      expect(loginRes.statusCode).toBe(200);
      expect(loginRes.body.data).toHaveProperty('token');
      expect(loginRes.body.data.user.role).toBe('staff');
    });

    it('Duplicate email returns HTTP 409', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate Staff',
          email: 'newstaff@medistock.com',
          password: 'AnotherPassword123!',
          role: 'staff',
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('GET /api/users returns paginated user list', async () => {
      const res = await request(app)
        .get('/api/users?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toHaveProperty('total');
      expect(res.body.pagination.page).toBe(1);
    });
  });

  describe('3. Admin Self-Demotion & Last Admin Protection', () => {
    it('Admin cannot demote their own account', async () => {
      const res = await request(app)
        .patch(`/api/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'staff' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/cannot demote your own account/i);
    });

    it('Admin cannot deactivate their own account', async () => {
      const res = await request(app)
        .patch(`/api/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/cannot deactivate your own account/i);
    });
  });

  describe('4. Token Invalidation on Password Change', () => {
    let targetUser;
    let oldToken;

    beforeAll(async () => {
      targetUser = await User.create({
        name: 'Reset Tester',
        email: 'resetuser@medistock.com',
        password: 'InitialPassword123!',
        role: 'staff',
      });

      // Login to obtain token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'resetuser@medistock.com',
          password: 'InitialPassword123!',
        });

      oldToken = loginRes.body.data.token;
    });

    it('Token works before password change', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${oldToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.user.email).toBe('resetuser@medistock.com');
    });

    it('User changes password via /api/auth/change-password; old token is rejected', async () => {
      // Delay 1.1s so token iat is strictly before new passwordChangedAt timestamp
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const changeRes = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${oldToken}`)
        .send({
          currentPassword: 'InitialPassword123!',
          newPassword: 'UpdatedPassword123!',
        });

      expect(changeRes.statusCode).toBe(200);
      expect(changeRes.body.success).toBe(true);

      // Verify that oldToken is now rejected
      const verifyOldToken = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${oldToken}`);

      expect(verifyOldToken.statusCode).toBe(401);
      expect(verifyOldToken.body.message).toMatch(/recently changed password/i);

      // Verify new password works
      const loginNew = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'resetuser@medistock.com',
          password: 'UpdatedPassword123!',
        });

      expect(loginNew.statusCode).toBe(200);
      expect(loginNew.body.data).toHaveProperty('token');
    });

    it('Admin resets user password via /api/users/:id/password; previous token is rejected', async () => {
      // Login with current password to get a fresh token
      const freshLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'resetuser@medistock.com',
          password: 'UpdatedPassword123!',
        });
      const activeToken = freshLogin.body.data.token;

      // Ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Admin resets password
      const resetRes = await request(app)
        .patch(`/api/users/${targetUser._id}/password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          password: 'AdminForcedPassword123!',
        });

      expect(resetRes.statusCode).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // Verify activeToken is immediately rejected
      const checkRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${activeToken}`);

      expect(checkRes.statusCode).toBe(401);
      expect(checkRes.body.message).toMatch(/recently changed password/i);
    });
  });
});
