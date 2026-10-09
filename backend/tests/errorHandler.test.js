const request = require('supertest');
const express = require('express');
const { z } = require('zod');
const jwt = require('jsonwebtoken');
const errorHandler = require('../src/middleware/errorHandler');
const AppError = require('../src/utils/AppError');

describe('errorHandler Middleware Unit & Integration Tests', () => {
  let testApp;

  beforeEach(() => {
    testApp = express();
    testApp.use(express.json());
  });

  it('Handles AppError operational errors with custom status and payload', async () => {
    testApp.get('/test-operational', (req, res, next) => {
      next(new AppError('Forbidden action', 403));
    });
    testApp.use(errorHandler);

    const res = await request(testApp).get('/test-operational');
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: false,
        message: 'Forbidden action',
      })
    );
  });

  it('Handles ZodError with clean field-level error details', async () => {
    testApp.post('/test-zod', (req, res, next) => {
      try {
        const schema = z.object({
          stock: z.number().int().min(0),
        });
        schema.parse(req.body);
      } catch (err) {
        return next(err);
      }
      res.json({ success: true });
    });
    testApp.use(errorHandler);

    const res = await request(testApp)
      .post('/test-zod')
      .send({ stock: 'invalid-string' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors[0]).toHaveProperty('field', 'stock');
  });

  it('Handles Mongoose CastError with 400', async () => {
    testApp.get('/test-cast', (req, res, next) => {
      const err = new Error('Cast to ObjectId failed');
      err.name = 'CastError';
      err.path = '_id';
      err.value = 'invalid-id';
      next(err);
    });
    testApp.use(errorHandler);

    const res = await request(testApp).get('/test-cast');
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid _id: invalid-id');
  });

  it('Handles Mongoose duplicate key error (11000) with 409', async () => {
    testApp.get('/test-duplicate', (req, res, next) => {
      const err = new Error('E11000 duplicate key error');
      err.code = 11000;
      err.keyValue = { email: 'test@example.com' };
      next(err);
    });
    testApp.use(errorHandler);

    const res = await request(testApp).get('/test-duplicate');
    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Duplicate value 'test@example.com' for field 'email'");
  });

  it('Handles Mongoose ValidationError with 400 and field messages', async () => {
    testApp.get('/test-validation', (req, res, next) => {
      const err = new Error('Validation failed');
      err.name = 'ValidationError';
      err.errors = {
        name: { path: 'name', message: 'Name is required' },
        price: { path: 'price', message: 'Price must be positive' },
      };
      next(err);
    });
    testApp.use(errorHandler);

    const res = await request(testApp).get('/test-validation');
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors).toEqual([
      { field: 'name', message: 'Name is required' },
      { field: 'price', message: 'Price must be positive' },
    ]);
  });

  it('Handles JsonWebTokenError with 401', async () => {
    testApp.get('/test-jwt', (req, res, next) => {
      const err = new jwt.JsonWebTokenError('invalid signature');
      next(err);
    });
    testApp.use(errorHandler);

    const res = await request(testApp).get('/test-jwt');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid token. Please log in again.');
  });

  it('Handles TokenExpiredError with 401', async () => {
    testApp.get('/test-jwt-expired', (req, res, next) => {
      const err = new jwt.TokenExpiredError('jwt expired', new Date());
      next(err);
    });
    testApp.use(errorHandler);

    const res = await request(testApp).get('/test-jwt-expired');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Your token has expired. Please log in again.');
  });

  it('Hides stack traces and obscures non-operational 500 error messages in production mode', async () => {
    const env = require('../src/config/env');
    const originalEnv = env.NODE_ENV;
    env.NODE_ENV = 'production';

    try {
      testApp.get('/test-prod-error', (req, res, next) => {
        const err = new Error('Sensitive database connection string leaked in error');
        next(err);
      });
      testApp.use(errorHandler);

      const res = await request(testApp).get('/test-prod-error');
      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Something went wrong. Please try again later.');
      expect(res.body.stack).toBeUndefined();
    } finally {
      env.NODE_ENV = originalEnv;
    }
  });
});
