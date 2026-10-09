const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const env = require('../src/config/env');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Medicine = require('../src/models/Medicine');
const { signToken } = require('../src/utils/token');

jest.setTimeout(30000);

describe('Phase 6: Computed Endpoints & Aggregation Pipelines Checkpoint', () => {
  let adminUser;
  let staffUser;
  let adminToken;
  let staffToken;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }

    // Clean up test collections for predictable manual calculations
    await User.deleteMany({ email: { $in: ['staff-phase6@medistock.com', 'admin-phase6@medistock.com'] } });
    await Medicine.deleteMany({});

    // Create Admin and Staff
    adminUser = await User.create({
      name: 'Admin AggTester',
      email: 'admin-phase6@medistock.com',
      password: 'AdminPassword123!',
      role: 'admin',
    });
    adminToken = signToken(adminUser._id.toString(), adminUser.role);

    staffUser = await User.create({
      name: 'Staff AggTester',
      email: 'staff-phase6@medistock.com',
      password: 'StaffPassword123!',
      role: 'staff',
    });
    staffToken = signToken(staffUser._id.toString(), staffUser.role);

    // Insert exact seed medicines from specification
    // Reference date anchors for predictable expiry testing
    const now = new Date();
    const plus30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const plus60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const plus120Days = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000);
    const minus10Days = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    const testMedicines = [
      {
        name: 'Paracetamol',
        price: 50,
        stock: 100,
        category: 'Tablet',
        expiry: plus30Days, // expiring soon (30 days)
        createdBy: adminUser._id,
      },
      {
        name: 'Ibuprofen',
        price: 60,
        stock: 0,
        category: 'Tablet',
        expiry: plus60Days, // expiring soon (60 days)
        createdBy: adminUser._id,
      },
      {
        name: 'Combiflam',
        price: 80,
        stock: 10,
        category: 'Tablet',
        expiry: plus120Days, // not expiring soon (>90 days)
        createdBy: adminUser._id,
      },
      {
        name: 'Crocin',
        price: 70,
        stock: 90,
        category: 'Syrup',
        expiry: plus120Days,
        createdBy: adminUser._id,
      },
      {
        name: 'Benadryl',
        price: 80,
        stock: 6,
        category: 'Syrup',
        expiry: plus120Days,
        createdBy: adminUser._id,
      },
      {
        name: 'Tetanus',
        price: 90,
        stock: 0,
        category: 'Injection',
        expiry: minus10Days, // expired in the past
        createdBy: adminUser._id,
      },
    ];

    await Medicine.insertMany(testMedicines);
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: ['staff-phase6@medistock.com', 'admin-phase6@medistock.com'] } });
    await Medicine.deleteMany({});

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('1. GET /api/dashboard/stats', () => {
    it('Accessible by staff (HTTP 200) and matches exact manual calculation', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const stats = res.body.data;

      // Manual checks:
      // totalMedicines: 6
      expect(stats.totalMedicines).toBe(6);

      // totalStock: 100 + 0 + 10 + 90 + 6 + 0 = 206
      expect(stats.totalStock).toBe(206);

      // lowStock (stock 1-10): Combiflam (10), Benadryl (6) = 2
      expect(stats.lowStock).toBe(2);

      // outOfStock (stock = 0): Ibuprofen (0), Tetanus (0) = 2
      expect(stats.outOfStock).toBe(2);

      // availableUnits (count of medicines with stock > 0): 4
      expect(stats.availableUnits).toBe(4);

      // inventoryValue: (50*100) + (60*0) + (80*10) + (70*90) + (80*6) + (90*0)
      // = 5000 + 0 + 800 + 6300 + 480 + 0 = 12580
      expect(stats.inventoryValue).toBe(12580);

      // attentionRequired: lowStock + outOfStock = 2 + 2 = 4
      expect(stats.attentionRequired).toBe(4);

      // recentMedicines: limit 5
      expect(stats.recentMedicines.length).toBe(5);

      // expiringSoon: Paracetamol (30d) and Ibuprofen (60d) = 2 items
      expect(stats.expiringSoon.length).toBe(2);
      expect(stats.expiringSoon[0].name).toBe('Paracetamol');
      expect(stats.expiringSoon[1].name).toBe('Ibuprofen');

      // categoryBreakdown: Tablet: 3, Syrup: 2, Injection: 1
      expect(stats.categoryBreakdown).toEqual(
        expect.arrayContaining([
          { category: 'Tablet', count: 3 },
          { category: 'Syrup', count: 2 },
          { category: 'Injection', count: 1 },
        ])
      );
    });

    it('Accessible by admin (HTTP 200)', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.totalMedicines).toBe(6);
    });
  });

  describe('2. GET /api/alerts', () => {
    it('Accessible by staff (HTTP 200) and groups lowStock, outOfStock, expiringSoon, expired', async () => {
      const res = await request(app)
        .get('/api/alerts')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const alerts = res.body.data;

      // lowStock: Benadryl (6), Combiflam (10)
      expect(alerts.lowStock.length).toBe(2);
      expect(alerts.lowStock[0].stock).toBe(6);
      expect(alerts.lowStock[1].stock).toBe(10);

      // outOfStock: Ibuprofen (0), Tetanus (0)
      expect(alerts.outOfStock.length).toBe(2);

      // expiringSoon: 2 items within 90 days
      expect(alerts.expiringSoon.length).toBe(2);
      expect(alerts.expiringSoon[0].name).toBe('Paracetamol');

      // expired: Tetanus (expiry in the past)
      expect(alerts.expired.length).toBe(1);
      expect(alerts.expired[0].name).toBe('Tetanus');
    });

    it('Accepts custom ?days query parameter and validates range', async () => {
      // With days=45, only Paracetamol (30d) is expiring soon, Ibuprofen (60d) is not
      const res45 = await request(app)
        .get('/api/alerts?days=45')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res45.statusCode).toBe(200);
      expect(res45.body.data.expiringSoon.length).toBe(1);
      expect(res45.body.data.expiringSoon[0].name).toBe('Paracetamol');

      // Rejects days=0 (out of range 1-365)
      const resBad = await request(app)
        .get('/api/alerts?days=0')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(resBad.statusCode).toBe(400);

      // Rejects days=400 (exceeds max 365)
      const resHigh = await request(app)
        .get('/api/alerts?days=400')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(resHigh.statusCode).toBe(400);
    });
  });

  describe('3. GET /api/reports/valuation', () => {
    it('Staff receives HTTP 403 Forbidden on reports endpoint', async () => {
      const res = await request(app)
        .get('/api/reports/valuation')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/do not have permission/i);
    });

    it('Admin receives HTTP 200 and report matches exact manual calculation', async () => {
      const res = await request(app)
        .get('/api/reports/valuation')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const report = res.body.data;

      // Overview
      expect(report.totalItems).toBe(6);
      expect(report.totalUnits).toBe(206);
      expect(report.totalInventoryValue).toBe(12580);

      // Medicines sorted by totalValue descending
      expect(report.medicines.length).toBe(6);
      // Top valued: Crocin (70*90 = 6300), then Paracetamol (50*100 = 5000)
      expect(report.medicines[0].name).toBe('Crocin');
      expect(report.medicines[0].totalValue).toBe(6300);
      expect(report.medicines[1].name).toBe('Paracetamol');
      expect(report.medicines[1].totalValue).toBe(5000);

      // Category Valuation
      expect(report.categoryValuation.length).toBe(3);
      // Syrup value: Crocin (6300) + Benadryl (480) = 6780
      const syrup = report.categoryValuation.find((c) => c.category === 'Syrup');
      expect(syrup.totalItems).toBe(2);
      expect(syrup.totalUnits).toBe(96);
      expect(syrup.totalStock).toBe(96);
      expect(syrup.totalValue).toBe(6780);

      // Tablet value: Paracetamol (5000) + Ibuprofen (0) + Combiflam (800) = 5800
      const tablet = report.categoryValuation.find((c) => c.category === 'Tablet');
      expect(tablet.totalItems).toBe(3);
      expect(tablet.totalUnits).toBe(110);
      expect(tablet.totalStock).toBe(110);
      expect(tablet.totalValue).toBe(5800);

      // Injection value: Tetanus (0)
      const injection = report.categoryValuation.find((c) => c.category === 'Injection');
      expect(injection.totalItems).toBe(1);
      expect(injection.totalUnits).toBe(0);
      expect(injection.totalStock).toBe(0);
      expect(injection.totalValue).toBe(0);
    });
  });
});
