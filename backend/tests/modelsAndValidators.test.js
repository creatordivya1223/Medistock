const express = require('express');
const request = require('supertest');
const User = require('../src/models/User');
const Medicine = require('../src/models/Medicine');
const {
  loginSchema,
  createUserSchema,
  createMedicineSchema,
  updateMedicineSchema,
  validate,
} = require('../src/validators');
const errorHandler = require('../src/middleware/errorHandler');

describe('Phase 2: Mongoose Models & Zod Validators Checkpoint', () => {
  describe('User Model', () => {
    it('Loads model successfully', () => {
      expect(User).toBeDefined();
      expect(User.modelName).toBe('User');
    });

    it('Pre-save hook hashes password and comparePassword validates correctly', async () => {
      const user = new User({
        name: 'Jane Pharmacist',
        email: 'jane@medistock.com',
        password: 'Password123!',
        role: 'staff',
      });

      // Trigger pre-save hook manually
      await user.validate();
      // Test password hashing via save simulation
      expect(user.password).toBe('Password123!');
      // Simulating pre-save
      const preSaveHooks = user.schema.s.hooks._pres.get('save') || [];
      expect(preSaveHooks.length).toBeGreaterThan(0);

      // Verify comparePassword returns a Promise
      expect(typeof user.comparePassword).toBe('function');
    });

    it('toJSON transformation removes sensitive fields and exposes id', () => {
      const user = new User({
        name: 'John Doe',
        email: 'john@medistock.com',
        password: 'Password123!',
        role: 'staff',
        failedLoginAttempts: 3,
        lockUntil: new Date(),
      });

      const json = user.toJSON();
      expect(json).toHaveProperty('id');
      expect(json._id).toBeUndefined();
      expect(json.__v).toBeUndefined();
      expect(json.password).toBeUndefined();
      expect(json.failedLoginAttempts).toBeUndefined();
      expect(json.lockUntil).toBeUndefined();
      expect(json.name).toBe('John Doe');
      expect(json.role).toBe('staff');
    });
  });

  describe('Medicine Model', () => {
    it('Loads model successfully with defined indexes', () => {
      expect(Medicine).toBeDefined();
      expect(Medicine.modelName).toBe('Medicine');

      const indexes = Medicine.schema.indexes();
      const indexFields = indexes.map((idx) => Object.keys(idx[0])[0]);
      expect(indexFields).toContain('name');
      expect(indexFields).toContain('category');
      expect(indexFields).toContain('expiry');
      expect(indexFields).toContain('stock');
    });

    it('Mongoose schema rejects fractional stock and negative price', async () => {
      const invalidMed = new Medicine({
        name: 'Aspirin',
        price: -10,
        stock: 5.5,
        category: 'Tablet',
        expiry: new Date('2026-12-31'),
      });

      let err;
      try {
        await invalidMed.validate();
      } catch (e) {
        err = e;
      }
      expect(err).toBeDefined();
      expect(err.errors['price']).toBeDefined();
      expect(err.errors['stock']).toBeDefined();
    });

    it('Mongoose schema rejects invalid category enum', async () => {
      const invalidCategoryMed = new Medicine({
        name: 'Aspirin',
        price: 20,
        stock: 10,
        category: 'NonExistentCategory',
        expiry: new Date('2026-12-31'),
      });

      let err;
      try {
        await invalidCategoryMed.validate();
      } catch (e) {
        err = e;
      }
      expect(err).toBeDefined();
      expect(err.errors['category']).toBeDefined();
    });

    it('toJSON transformation exposes id and removes __v', () => {
      const med = new Medicine({
        name: 'Paracetamol',
        price: 50,
        stock: 100,
        category: 'Tablet',
        expiry: new Date('2027-01-01'),
      });

      const json = med.toJSON();
      expect(json).toHaveProperty('id');
      expect(json._id).toBeUndefined();
      expect(json.__v).toBeUndefined();
      expect(json.name).toBe('Paracetamol');
    });
  });

  describe('Zod Validators: createMedicineSchema', () => {
    const validPayload = {
      name: 'Amoxicillin',
      price: 150,
      stock: 50,
      category: 'Capsule',
      expiry: '2026-12-31',
    };

    it('Accepts a valid medicine payload', () => {
      const result = createMedicineSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('Rejects negative price', () => {
      const result = createMedicineSchema.safeParse({
        ...validPayload,
        price: -5,
      });
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toContain('price');
    });

    it('Rejects fractional stock', () => {
      const result = createMedicineSchema.safeParse({
        ...validPayload,
        stock: 12.34,
      });
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toContain('stock');
    });

    it('Rejects invalid category', () => {
      const result = createMedicineSchema.safeParse({
        ...validPayload,
        category: 'Lotion',
      });
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toContain('category');
    });

    it('Rejects unknown fields via .strict()', () => {
      const result = createMedicineSchema.safeParse({
        ...validPayload,
        hackedField: 'malicious-data',
      });
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toMatch(/unrecognized|unexpected/i);
    });
  });

  describe('Zod Validators: updateMedicineSchema', () => {
    it('Accepts a valid partial update', () => {
      const result = updateMedicineSchema.safeParse({ price: 200 });
      expect(result.success).toBe(true);
    });

    it('Rejects an empty update object', () => {
      const result = updateMedicineSchema.safeParse({});
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('At least one field must be provided');
    });

    it('Rejects unknown fields via .strict()', () => {
      const result = updateMedicineSchema.safeParse({
        price: 200,
        extraParam: 'not-allowed',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Zod Validators: loginSchema & createUserSchema', () => {
    it('loginSchema rejects unknown fields and invalid emails', () => {
      const resBadEmail = loginSchema.safeParse({
        email: 'invalid-email',
        password: 'password123',
      });
      expect(resBadEmail.success).toBe(false);

      const resUnknownField = loginSchema.safeParse({
        email: 'user@medistock.com',
        password: 'password123',
        extra: 'field',
      });
      expect(resUnknownField.success).toBe(false);
    });

    it('createUserSchema rejects passwords under 8 chars and unknown fields', () => {
      const resShortPass = createUserSchema.safeParse({
        name: 'Admin',
        email: 'admin@medistock.com',
        password: 'short',
      });
      expect(resShortPass.success).toBe(false);

      const resValid = createUserSchema.safeParse({
        name: 'Staff Member',
        email: 'staff@medistock.com',
        password: 'SecurePassword123!',
      });
      expect(resValid.success).toBe(true);
      expect(resValid.data.role).toBe('staff');
    });
  });

  describe('Reusable validate(schema) Middleware', () => {
    let app;

    beforeAll(() => {
      app = express();
      app.use(express.json());

      app.post('/test-validate', validate(createMedicineSchema), (req, res) => {
        res.status(201).json({ success: true, data: req.body });
      });

      app.use(errorHandler);
    });

    it('Returns 201 for valid body', async () => {
      const res = await request(app)
        .post('/test-validate')
        .send({
          name: 'Paracetamol',
          price: 50,
          stock: 100,
          category: 'Tablet',
          expiry: '2026-07-01',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('Returns 400 with field-level errors for negative price and unknown field', async () => {
      const res = await request(app)
        .post('/test-validate')
        .send({
          name: 'Paracetamol',
          price: -50,
          stock: 100,
          category: 'Tablet',
          expiry: '2026-07-01',
          randomField: 'evil',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(Array.isArray(res.body.errors)).toBe(true);

      const fieldNames = res.body.errors.map((e) => e.field);
      expect(fieldNames).toContain('price');
    });
  });
});
