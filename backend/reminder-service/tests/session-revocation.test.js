const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'fixture-session-check-key';
process.env.INTERNAL_API_KEY = 'fixture-internal-key-that-is-long-enough';
process.env.AUTH_SERVICE_URL = 'http://auth.test';
const authenticate = require('../src/middlewares/authenticate');
const payload = { id: '11111111-1111-4111-8111-111111111111', role: 'elderly', sid: '22222222-2222-4222-8222-222222222222', sv: 0 };
const token = () => jwt.sign(payload, process.env.JWT_SECRET, { issuer: 'aha-auth-service', audience: 'aha-api', expiresIn: '5m' });
function response() { return { code: 200, status(n) { this.code = n; return this; }, json(body) { this.body = body; return this; } }; }
beforeEach(() => { global.fetch = jest.fn(); });
test('a valid signature cannot bypass server-side revoked-session denial', async () => {
  global.fetch.mockResolvedValue({ ok: true, json: async () => ({ active: false }) });
  const next = jest.fn(), r = response(); await authenticate({ headers: { authorization: 'Bearer ' + token() } }, r, next);
  expect(r.code).toBe(401); expect(next).not.toHaveBeenCalled();
});
test('auth service outage fails closed with a retryable service error', async () => {
  global.fetch.mockRejectedValue(Error('simulated timeout'));
  const next = jest.fn(), r = response(); await authenticate({ headers: { authorization: 'Bearer ' + token() } }, r, next);
  expect(r.code).toBe(503); expect(next).not.toHaveBeenCalled();
});
test('active sessions still reach the application route', async () => {
  global.fetch.mockResolvedValue({ ok: true, json: async () => ({ active: true }) });
  const req = { headers: { authorization: 'Bearer ' + token() } }, next = jest.fn(), r = response();
  await authenticate(req, r, next); expect(next).toHaveBeenCalledTimes(1); expect(req.user.id).toBe(payload.id);
  expect(global.fetch.mock.calls[0][1].redirect).toBe('error');
});
test('forged JWTs are rejected before calling the internal auth service', async () => {
  const next = jest.fn(), r = response(); await authenticate({ headers: { authorization: 'Bearer fake.token.value' } }, r, next);
  expect(r.code).toBe(401); expect(global.fetch).not.toHaveBeenCalled();
});
