const request = require('supertest');
const app = require('../src/app');

describe('MediStock Backend Foundation & Security Checkpoint', () => {
  it('GET /api/health returns 200 and { success: true, status: "ok" }', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      status: 'ok',
    });
  });

  it('Unknown route returns clean JSON 404', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toMatch(/not found/i);
  });
});
