process.env.INTERNAL_API_KEY = require('node:crypto').randomBytes(32).toString('hex');
process.env.INTERNAL_RATE_LIMIT_MAX = '120';
process.env.JWT_SECRET = 'test-access-secret-123456789012345678901234567890';

jest.mock('../src/config/db', () => ({
  query: jest.fn(async () => ({ rows: [], rowCount: 0 })),
}));

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const recipientPath = '/family/internal/22222222-2222-4222-8222-222222222222/recipients';
const elderlyPath = '/family/internal/22222222-2222-4222-8222-222222222222/elderly';

describe('trusted internal family lookup quota', () => {
  test('bad or missing internal key never bypasses authentication', async () => {
    for (const supplied of [null, 'invalid-key']) {
      const req = request(app).get(recipientPath);
      if (supplied !== null) req.set('x-internal-api-key', supplied);
      const res = await req;
      expect(res.statusCode).toBe(401);
    }
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('trusted recipient and elderly lookups share a separate bounded quota', async () => {
    for (let index = 0; index < 120; index += 1) {
      const res = await request(app).get(index % 2 ? elderlyPath : recipientPath)
        .set('x-internal-api-key', process.env.INTERNAL_API_KEY);
      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({ success: true, data: [] });
    }
    const blocked = await request(app).get(recipientPath)
      .set('x-internal-api-key', process.env.INTERNAL_API_KEY);
    expect(blocked.statusCode).toBe(429);
  });

  test('valid key does not exempt unrelated routes from public limiter', async () => {
    const statuses = [];
    for (let i = 0; i < 101; i += 1) {
      const res = await request(app).get('/health')
        .set('x-internal-api-key', process.env.INTERNAL_API_KEY);
      statuses.push(res.statusCode);
    }
    expect(statuses[0]).toBe(200);
    expect(statuses[100]).toBe(429);
  });
});
