const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const Medicine = require('../src/models/Medicine');
const { signToken } = require('../src/utils/token');

jest.setTimeout(45000);

describe('Phase 7: Security Review, Hardening & Automated Integration Tests (MongoMemoryServer)', () => {
  let mongoServer;
  let adminUser;
  let staffUser;
  let adminToken;
  let staffToken;
  let testMedicineId;

  beforeAll(async () => {
    // Disconnect any existing mongoose connection to ensure clean in-memory database
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    await mongoose.connect(uri, {
      runtimeAdapters: { os: require('os') },
    });

    // Seed test admin user
    adminUser = await User.create({
      name: 'Security Admin',
      email: 'admin-sec@medistock.com',
      password: 'AdminPassword123!',
      role: 'admin',
      isActive: true,
    });
    adminToken = signToken(adminUser._id.toString(), 'admin');

    // Seed test staff user
    staffUser = await User.create({
      name: 'Security Staff',
      email: 'staff-sec@medistock.com',
      password: 'StaffPassword123!',
      role: 'staff',
      isActive: true,
    });
    staffToken = signToken(staffUser._id.toString(), 'staff');

    // Seed test medicines for validation & dashboard tests
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const in120Days = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000);
    const past10Days = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    // Med A: Tablet, low stock (5), expiring soon (+30d)
    const medA = await Medicine.create({
      name: 'Paracetamol 500mg',
      price: 100,
      stock: 5,
      category: 'Tablet',
      expiry: in30Days,
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });
    testMedicineId = medA._id.toString();

    // Med B: Syrup, out of stock (0), expiring soon (+60d)
    await Medicine.create({
      name: 'Cough Reliever 100ml',
      price: 50,
      stock: 0,
      category: 'Syrup',
      expiry: in60Days,
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });

    // Med C: Injection, normal stock (20), expiring far future (+120d)
    await Medicine.create({
      name: 'Insulin Pen',
      price: 200,
      stock: 20,
      category: 'Injection',
      expiry: in120Days,
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });

    // Med D: Capsule, low stock (10), already expired (-10d)
    await Medicine.create({
      name: 'Amoxicillin 500mg',
      price: 150,
      stock: 10,
      category: 'Capsule',
      expiry: past10Days,
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe('1. Authentication: Success & Failure', () => {
    it('should successfully log in admin and return token without password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', '10.0.1.1')
        .send({
          email: 'admin-sec@medistock.com',
          password: 'AdminPassword123!',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('admin-sec@medistock.com');
      expect(res.body.data.user.role).toBe('admin');
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('should fail with 401 and generic message when password is wrong', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', '10.0.1.2')
        .send({
          email: 'admin-sec@medistock.com',
          password: 'WrongPassword999!',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('should fail with 401 and generic message when user does not exist', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', '10.0.1.3')
        .send({
          email: 'nonexistent@medistock.com',
          password: 'SomePassword123!',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });
  });

  describe('2. NoSQL Injection Prevention', () => {
    it('should reject NoSQL injection payload { email: { "$gt": "" }, password: "x" } with 400 Validation Error', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', '10.0.2.1')
        .send({
          email: { $gt: '' },
          password: 'x',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
    });
  });

  describe('3. Account Lockout Protection', () => {
    it('should lock account after 5 consecutive failed attempts and reject 6th attempt', async () => {
      const lockoutUser = await User.create({
        name: 'Lockout Target',
        email: 'lockout-target@medistock.com',
        password: 'OriginalPassword123!',
        role: 'staff',
        isActive: true,
      });

      // Execute 5 failed login attempts with unique forwarded IPs to avoid IP rate limiting
      for (let i = 1; i <= 5; i++) {
        const res = await request(app)
          .post('/api/auth/login')
          .set('X-Forwarded-For', `10.0.3.${i}`)
          .send({
            email: 'lockout-target@medistock.com',
            password: 'BadPassword!',
          });

        expect(res.statusCode).toBe(401);
        expect(res.body.message).toBe('Invalid email or password');
      }

      // Verify user document has lockUntil set in future
      const lockedUserDoc = await User.findById(lockoutUser._id);
      expect(lockedUserDoc.lockUntil).not.toBeNull();
      expect(new Date(lockedUserDoc.lockUntil).getTime()).toBeGreaterThan(Date.now());

      // 6th attempt with correct password must be rejected due to account lockout
      const resLocked = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', '10.0.3.6')
        .send({
          email: 'lockout-target@medistock.com',
          password: 'OriginalPassword123!',
        });

      expect(resLocked.statusCode).toBe(401);
      expect(resLocked.body.success).toBe(false);
      expect(resLocked.body.message).toMatch(/Account is temporarily locked/i);
    });
  });

  describe('4. Authentication Middleware (protect)', () => {
    it('should reject request without token on protected route with 401', async () => {
      const res = await request(app).get('/api/medicines');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not logged in/i);
    });

    it('should reject request with malformed or invalid token with 401', async () => {
      const res = await request(app)
        .get('/api/medicines')
        .set('Authorization', 'Bearer invalid.tampered.token');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid token/i);
    });
  });

  describe('5. Role-Based Access Control (RBAC)', () => {
    it('staff should receive 403 Forbidden when trying to delete medicine', async () => {
      const res = await request(app)
        .delete(`/api/medicines/${testMedicineId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/do not have permission/i);
    });

    it('staff should receive 403 Forbidden when trying to access valuation report', async () => {
      const res = await request(app)
        .get('/api/reports/valuation')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/do not have permission/i);
    });

    it('staff should receive 403 Forbidden when trying to access user management endpoints', async () => {
      const getRes = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(getRes.statusCode).toBe(403);

      const postRes = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Hacker User',
          email: 'hacker@test.com',
          password: 'Password123!',
          role: 'staff',
        });
      expect(postRes.statusCode).toBe(403);
    });

    it('admin should receive 200 OK on valuation report and user list', async () => {
      const reportRes = await request(app)
        .get('/api/reports/valuation')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(reportRes.statusCode).toBe(200);
      expect(reportRes.body.success).toBe(true);

      const usersRes = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(usersRes.statusCode).toBe(200);
      expect(usersRes.body.success).toBe(true);
    });
  });

  describe('6. Medicine CRUD & Input Validation', () => {
    it('should reject medicine with negative stock (400)', async () => {
      const res = await request(app)
        .post('/api/medicines')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Negative Stock Medicine',
          price: 50,
          stock: -5,
          category: 'Tablet',
          expiry: '2026-12-31',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
    });

    it('should reject medicine with invalid category (400)', async () => {
      const res = await request(app)
        .post('/api/medicines')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Invalid Category Medicine',
          price: 50,
          stock: 10,
          category: 'HerbalCandy',
          expiry: '2026-12-31',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
    });

    it('should reject medicine with non-integer stock (400)', async () => {
      const res = await request(app)
        .post('/api/medicines')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Float Stock Medicine',
          price: 50,
          stock: 12.5,
          category: 'Syrup',
          expiry: '2026-12-31',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
    });

    it('should reject medicine with negative price in update (400)', async () => {
      const res = await request(app)
        .put(`/api/medicines/${testMedicineId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          price: -25,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
    });

    it('should reject unexpected extra fields via strict schema (400)', async () => {
      const res = await request(app)
        .post('/api/medicines')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Strict Validation Medicine',
          price: 50,
          stock: 10,
          category: 'Tablet',
          expiry: '2026-12-31',
          maliciousField: 'exploit',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
    });
  });

  describe('7. Dashboard Stats Calculation Accuracy', () => {
    it('should compute exact database-level metrics matching seeded in-memory data', async () => {
      // Current seeded medicines in this in-memory test DB:
      // Med A: stock 5,  price 100, Tablet,    expiring +30d
      // Med B: stock 0,  price 50,  Syrup,     expiring +60d
      // Med C: stock 20, price 200, Injection, expiring +120d
      // Med D: stock 10, price 150, Capsule,   expired -10d
      //
      // Expected manual calculations:
      // totalMedicines: 4
      // totalStock: 5 + 0 + 20 + 10 = 35
      // lowStock (1-10): 2 (Med A: 5, Med D: 10)
      // outOfStock (=0): 1 (Med B: 0)
      // availableUnits (>0): 3 (Med A, Med C, Med D)
      // inventoryValue: (5 * 100) + (0 * 50) + (20 * 200) + (10 * 150) = 500 + 0 + 4000 + 1500 = 6000
      // attentionRequired: lowStock + outOfStock = 2 + 1 = 3
      // expiringSoon (within 90 days, not expired): 2 (Med A at +30d, Med B at +60d)

      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const stats = res.body.data;
      expect(stats.totalMedicines).toBe(4);
      expect(stats.totalStock).toBe(35);
      expect(stats.lowStock).toBe(2);
      expect(stats.outOfStock).toBe(1);
      expect(stats.availableUnits).toBe(3);
      expect(stats.inventoryValue).toBe(6000);
      expect(stats.attentionRequired).toBe(3);
      expect(stats.expiringSoon).toHaveLength(2);
      expect(stats.categoryBreakdown).toHaveLength(4);
    });
  });

  describe('8. Structured Audit Logging', () => {
    it('should output structured JSON audit log entry on medicine creation', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const res = await request(app)
        .post('/api/medicines')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Audited Aspirin',
          price: 45,
          stock: 100,
          category: 'Tablet',
          expiry: '2026-11-20',
        });

      expect(res.statusCode).toBe(201);

      // Find the audit log output from console.log calls
      const auditCalls = consoleSpy.mock.calls
        .map((args) => {
          try {
            return JSON.parse(args[0]);
          } catch {
            return null;
          }
        })
        .filter((entry) => entry && entry.type === 'AUDIT' && entry.action === 'CREATE_MEDICINE');

      expect(auditCalls.length).toBeGreaterThan(0);
      const auditEntry = auditCalls[0];
      expect(auditEntry.action).toBe('CREATE_MEDICINE');
      expect(auditEntry.userId).toBe(staffUser._id.toString());
      expect(auditEntry.targetId).toBe(res.body.data.id);
      expect(auditEntry.timestamp).toBeDefined();

      consoleSpy.mockRestore();
    });
  });
});
