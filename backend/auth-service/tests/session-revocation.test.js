process.env.JWT_SECRET = 'fixture-access-session-secret';
process.env.JWT_REFRESH_SECRET = 'fixture-refresh-session-secret';
jest.mock('../src/config/db', () => ({ query: jest.fn(), connect: jest.fn() }));
const pool = require('../src/config/db');
const tokens = require('../src/services/token.service');
const userId = '11111111-1111-4111-8111-111111111111';
const sid = '22222222-2222-4222-8222-222222222222';
beforeEach(() => jest.clearAllMocks());

test('legacy sessions remain valid only at the initial account version', async () => {
  pool.query.mockResolvedValueOnce({ rows: [{ session_version: 0 }] });
  expect(await tokens.isSessionActive({ id: userId })).toBe(true);
  pool.query.mockResolvedValueOnce({ rows: [{ session_version: 1 }] });
  expect(await tokens.isSessionActive({ id: userId })).toBe(false);
});
test('revoked session and stale account version deny access before JWT expiry', async () => {
  pool.query.mockResolvedValueOnce({ rows: [{ session_version: 0, session_id: null }] });
  expect(await tokens.isSessionActive({ id: userId, sid, sv: 0 })).toBe(false);
  pool.query.mockResolvedValueOnce({ rows: [{ session_version: 1, session_id: sid }] });
  expect(await tokens.isSessionActive({ id: userId, sid, sv: 0 })).toBe(false);
  pool.query.mockResolvedValueOnce({ rows: [{ session_version: 1, session_id: sid }] });
  expect(await tokens.isSessionActive({ id: userId, sid, sv: 1 })).toBe(true);
});
test('missing account and invalid session-version claims fail closed', async () => {
  pool.query.mockResolvedValue({ rows: [] });
  expect(await tokens.isSessionActive({ id: userId })).toBe(false);
  expect(await tokens.isSessionActive({ id: userId, sv: '0' })).toBe(false);
});
test('logout revokes the signed session without trusting a supplied user id', async () => {
  const client = { query: jest.fn(async () => ({ rows: [{ session_version: 0, session_id: sid }], rowCount: 1 })), release: jest.fn() };
  pool.connect.mockResolvedValue(client);
  const access = tokens.generateAccessToken({ id: userId, role: 'elderly', session_version: 0 }, sid);
  await tokens.revokeSession(null, access);
  const revoke = client.query.mock.calls.find(([sql]) => sql.startsWith('UPDATE auth_sessions'));
  expect(revoke[1]).toEqual([sid, userId]);
  expect(client.query).toHaveBeenCalledWith('COMMIT');
  expect(client.release).toHaveBeenCalledTimes(1);
});
test('legacy logout invalidates all account sessions to cover unbound old access JWTs', async () => {
  const client = { query: jest.fn(async () => ({ rows: [{ session_version: 0 }], rowCount: 1 })), release: jest.fn() };
  pool.connect.mockResolvedValue(client);
  await tokens.revokeSession(null, tokens.generateAccessToken({ id: userId, role: 'elderly' }));
  expect(client.query).toHaveBeenCalledWith('UPDATE users SET session_version = session_version + 1 WHERE id = $1', [userId]);
});
test('database failure rolls back global revocation and never reports successful logout', async () => {
  const client = { query: jest.fn(async (sql) => { if (sql.startsWith('UPDATE auth_sessions')) throw Error('simulated outage'); return { rows: [] }; }), release: jest.fn() };
  pool.connect.mockResolvedValue(client);
  await expect(tokens.revokeAllForUser(userId)).rejects.toThrow('simulated outage');
  expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  expect(client.query).not.toHaveBeenCalledWith('COMMIT');
});
test('stale legacy tokens cannot repeatedly log out newly authenticated sessions', async () => {
  const client = { query: jest.fn(async () => ({ rows: [{ session_version: 1 }], rowCount: 1 })), release: jest.fn() };
  pool.connect.mockResolvedValue(client);
  const staleAccess = tokens.generateAccessToken({ id: userId, role: 'elderly', session_version: 0 });
  await tokens.revokeSession(null, staleAccess);
  expect(client.query.mock.calls.some(([sql]) => sql.startsWith('UPDATE'))).toBe(false);
  expect(client.query).toHaveBeenCalledWith('ROLLBACK');
});
