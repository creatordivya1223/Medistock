const request = require('supertest');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const app = require('../src/app');

describe('MediStock Security & Middleware Suite', () => {
  it('GET /api/health returns 200 with { success: true, status: "ok" }', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      status: 'ok',
    });
  });

  it('Unknown route returns clean JSON 404 error response', async () => {
    const res = await request(app).get('/api/non-existent-route');
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('Resource not found');
  });

  it('Blocks origins not in CLIENT_URL via CORS', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://malicious-site.com');

    // CORS middleware either errors or responds with 403 / does not set allow-origin
    expect([403, 500]).toContain(res.statusCode);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('Allows valid origin from CLIENT_URL', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');

    expect(res.statusCode).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('Allows valid origin even if origin contains a trailing slash', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173/');

    expect(res.statusCode).toBe(200);
  });

  it('Verifies trust proxy is set to 1 for cloud load balancer support', () => {
    expect(app.get('trust proxy')).toBe(1);
  });

  it('Includes standard rate limit headers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers).toHaveProperty('ratelimit-limit');
    expect(res.headers).toHaveProperty('ratelimit-remaining');
  });

  it('Refuses to start when JWT_SECRET is missing or invalid (< 32 chars)', () => {
    const dummyEnvPath = path.resolve(__dirname, 'temp-invalid.env');
    fs.writeFileSync(
      dummyEnvPath,
      [
        'NODE_ENV=development',
        'PORT=5000',
        'MONGO_URI=mongodb://localhost:27017/test',
        'JWT_SECRET=too_short',
        'CLIENT_URL=http://localhost:5173',
        'ADMIN_NAME=Admin',
        'ADMIN_EMAIL=admin@test.com',
        'ADMIN_PASSWORD=password123',
      ].join('\n')
    );

    try {
      expect(() => {
        execSync(`node -e "process.env.ENV_FILE='${dummyEnvPath}'; require('./src/config/env');"`, {
          cwd: path.resolve(__dirname, '..'),
          stdio: 'pipe',
        });
      }).toThrow();
    } finally {
      if (fs.existsSync(dummyEnvPath)) {
        fs.unlinkSync(dummyEnvPath);
      }
    }
  });

  it('Refuses to start when JWT_SECRET is completely missing', () => {
    const dummyEnvPath = path.resolve(__dirname, 'temp-missing-jwt.env');
    fs.writeFileSync(
      dummyEnvPath,
      [
        'NODE_ENV=development',
        'PORT=5000',
        'MONGO_URI=mongodb://localhost:27017/test',
        'CLIENT_URL=http://localhost:5173',
        'ADMIN_NAME=Admin',
        'ADMIN_EMAIL=admin@test.com',
        'ADMIN_PASSWORD=password123',
      ].join('\n')
    );

    try {
      expect(() => {
        execSync(`node -e "delete process.env.JWT_SECRET; process.env.ENV_FILE='${dummyEnvPath}'; require('./src/config/env');"`, {
          cwd: path.resolve(__dirname, '..'),
          stdio: 'pipe',
        });
      }).toThrow();
    } finally {
      if (fs.existsSync(dummyEnvPath)) {
        fs.unlinkSync(dummyEnvPath);
      }
    }
  });
});
