const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const env = require('../src/config/env');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Medicine = require('../src/models/Medicine');
const { signToken } = require('../src/utils/token');

jest.setTimeout(30000);

describe('Phase 4: Medicine Endpoints with RBAC Checkpoint', () => {
  let adminUser;
  let staffUser;
  let adminToken;
  let staffToken;
  let testMedicine;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }

    // Clean up test users and medicines
    await User.deleteMany({ email: { $in: ['staff-test@medistock.com', 'admin-med-test@medistock.com'] } });
    await Medicine.deleteMany({ name: { $regex: /^TestMed/ } });

    // Create Admin
    adminUser = await User.create({
      name: 'Admin MedTester',
      email: 'admin-med-test@medistock.com',
      password: 'AdminPassword123!',
      role: 'admin',
    });
    adminToken = signToken(adminUser._id.toString(), adminUser.role);

    // Create Staff
    staffUser = await User.create({
      name: 'Staff MedTester',
      email: 'staff-test@medistock.com',
      password: 'StaffPassword123!',
      role: 'staff',
    });
    staffToken = signToken(staffUser._id.toString(), staffUser.role);
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: ['staff-test@medistock.com', 'admin-med-test@medistock.com'] } });
    await Medicine.deleteMany({ name: { $regex: /^TestMed/ } });

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('Authentication & Access Guard', () => {
    it('1. Requests without token return 401', async () => {
      const res = await request(app).get('/api/medicines');
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not logged in/i);
    });

    it('2. Invalid ObjectId returns 400 via validateObjectId middleware', async () => {
      const res = await request(app)
        .get('/api/medicines/invalid-mongo-id-123')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid id format/i);
    });

    it('3. Non-existent valid ObjectId returns 404', async () => {
      const randomId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/medicines/${randomId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not found/i);
    });
  });

  describe('Staff CRUD Operations & Permissions', () => {
    it('4. Staff can create a medicine (POST /api/medicines) returning 201', async () => {
      const res = await request(app)
        .post('/api/medicines')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'TestMed Paracetamol 500mg',
          price: 45,
          stock: 100,
          category: 'Tablet',
          expiry: '2027-01-01',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('TestMed Paracetamol 500mg');
      expect(res.body.data.createdBy.toString()).toBe(staffUser._id.toString());

      testMedicine = res.body.data;
    });

    it('5. POST rejects negative price with 400', async () => {
      const res = await request(app)
        .post('/api/medicines')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'TestMed Bad Price',
          price: -10,
          stock: 10,
          category: 'Tablet',
          expiry: '2027-01-01',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors.some((e) => e.field === 'price')).toBe(true);
    });

    it('6. Staff can edit a medicine (PUT /api/medicines/:id)', async () => {
      const res = await request(app)
        .put(`/api/medicines/${testMedicine.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          price: 55,
          stock: 80,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.price).toBe(55);
      expect(res.body.data.stock).toBe(80);
      expect(res.body.data.name).toBe(testMedicine.name);
      expect(res.body.data.updatedBy.toString()).toBe(staffUser._id.toString());
    });

    it('7. Staff receives 403 Forbidden when attempting DELETE', async () => {
      const res = await request(app)
        .delete(`/api/medicines/${testMedicine.id}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/do not have permission/i);
    });
  });

  describe('Admin Permissions & Deletion', () => {
    it('8. Admin can delete a medicine (DELETE /api/medicines/:id) returning 200', async () => {
      const res = await request(app)
        .delete(`/api/medicines/${testMedicine.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/deleted successfully/i);

      // Verify deletion
      const checkRes = await request(app)
        .get(`/api/medicines/${testMedicine.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(checkRes.statusCode).toBe(404);
    });
  });

  describe('Search, Filtering, Sorting & Pagination', () => {
    beforeAll(async () => {
      // Seed a test dataset
      await Medicine.create([
        {
          name: 'TestMed Amoxicillin 250mg',
          price: 120,
          stock: 5, // low stock
          category: 'Capsule',
          expiry: new Date('2026-08-01'),
          createdBy: adminUser._id,
        },
        {
          name: 'TestMed Cough Syrup [Special+Formula]',
          price: 85,
          stock: 0, // out of stock
          category: 'Syrup',
          expiry: new Date('2026-11-01'),
          createdBy: adminUser._id,
        },
        {
          name: 'TestMed Tetanus Toxoid Injection',
          price: 150,
          stock: 25, // available
          category: 'Injection',
          expiry: new Date('2027-05-01'),
          createdBy: adminUser._id,
        },
        {
          name: 'TestMed Vitamin C Tablet',
          price: 30,
          stock: 8, // low stock
          category: 'Tablet',
          expiry: new Date('2027-03-01'),
          createdBy: adminUser._id,
        },
      ]);
    });

    it('9. Search with regex special characters matches safely', async () => {
      const searchTerm = encodeURIComponent('Syrup [Special+Formula]');
      const res = await request(app)
        .get(`/api/medicines?search=${searchTerm}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toContain('Cough Syrup');
    });

    it('10. Filter by category works accurately', async () => {
      const res = await request(app)
        .get('/api/medicines?category=Capsule')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.every((m) => m.category === 'Capsule')).toBe(true);
    });

    it('11. Filter by stockStatus=low matches stock 1-10', async () => {
      const res = await request(app)
        .get('/api/medicines?stockStatus=low&search=TestMed')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data.every((m) => m.stock >= 1 && m.stock <= 10)).toBe(true);
    });

    it('12. Filter by stockStatus=out matches stock 0', async () => {
      const res = await request(app)
        .get('/api/medicines?stockStatus=out&search=TestMed')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].stock).toBe(0);
    });

    it('13. Sorting by price asc works correctly', async () => {
      const res = await request(app)
        .get('/api/medicines?search=TestMed&sortBy=price&order=asc')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.statusCode).toBe(200);
      const prices = res.body.data.map((m) => m.price);
      const sortedPrices = [...prices].sort((a, b) => a - b);
      expect(prices).toEqual(sortedPrices);
    });

    it('14. Pagination returns correct structure and slices', async () => {
      const res = await request(app)
        .get('/api/medicines?search=TestMed&page=1&limit=2')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 4,
        totalPages: 2,
      });

      // Page 2
      const resPage2 = await request(app)
        .get('/api/medicines?search=TestMed&page=2&limit=2')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(resPage2.statusCode).toBe(200);
      expect(resPage2.body.data.length).toBe(2);
      expect(resPage2.body.pagination.page).toBe(2);
    });

    it('15. Rejects unknown query parameters via strict validator', async () => {
      const res = await request(app)
        .get('/api/medicines?unknownQuery=malicious')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
    });
  });
});
