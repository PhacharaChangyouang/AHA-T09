process.env.JWT_SECRET = 'test-access-secret-that-is-long-enough-123456789';
process.env.INTERNAL_API_KEY = require('node:crypto').randomBytes(32).toString('hex');
delete process.env.VAPID_PUBLIC_KEY;
delete process.env.VAPID_PRIVATE_KEY;
delete process.env.VAPID_SUBJECT;
process.env.AUTH_SERVICE_URL = 'http://auth-service:3001';

jest.mock('../src/config/db', () => ({ query: jest.fn() }));
jest.mock('web-push', () => ({ setVapidDetails: jest.fn(), sendNotification: jest.fn() }));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const pool = require('../src/config/db');
const app = require('../src/server');

function token(role = 'elderly') {
  return jwt.sign(
    { id: '11111111-1111-4111-8111-111111111111', phone: '0800000000', role },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', issuer: 'aha-auth-service', audience: 'aha-api', expiresIn: '5m' }
  );
}

describe('notification security boundaries', () => {
  beforeEach(() => {
    pool.query.mockReset();
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ active: true }) }));
  });

  it('rejects user-created notifications that could spoof system events', async () => {
    const response = await request(app)
      .post('/api/notifications')
      .set('Authorization', `Bearer ${token()}`)
      .send({ type: 'emergency', title: 'fake', message: 'fake system event' });
    expect(response.statusCode).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('rejects invalid emergency coordinates before service calls', async () => {
    const response = await request(app)
      .post('/api/notifications/emergency')
      .set('Authorization', `Bearer ${token()}`)
      .send({ message: 'help', latitude: 200, longitude: 100 });
    expect(response.statusCode).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it.each([
    { latitude: 0, longitude: 0 },
    { accuracy: 10 },
    { latitude: null },
  ])('rejects all location fields in Academic SOS: %j', async (fields) => {
    const response = await request(app)
      .post('/api/notifications/emergency')
      .set('Authorization', `Bearer ${token()}`)
      .send({ message: 'synthetic SOS', ...fields });
    expect(response.statusCode).toBe(400);
    expect(response.body.code).toBe('ACADEMIC_LOCATION_DISABLED');
    expect(pool.query).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledTimes(1); // session verification only
  });

  it('rejects malformed resource ids without querying the database', async () => {
    const response = await request(app)
      .get('/api/notifications/not-a-uuid')
      .set('Authorization', `Bearer ${token()}`);
    expect(response.statusCode).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('rejects JWTs without the required issuer and audience', async () => {
    const weakToken = jwt.sign(
      { id: '11111111-1111-4111-8111-111111111111', role: 'elderly' },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );
    const response = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${weakToken}`);
    expect(response.statusCode).toBe(401);
  });

  it('rejects arbitrary push endpoints because Academic delivery is disabled', async () => {
    const response = await request(app)
      .post('/api/push/subscribe')
      .set('Authorization', `Bearer ${token()}`)
      .send({ endpoint: 'https://127.0.0.1/internal', keys: { p256dh: 'abc', auth: 'def' } });
    expect(response.statusCode).toBe(503);
    expect(pool.query).not.toHaveBeenCalled();
  });
});

