jest.mock('../src/models/user.model', () => ({
  findByGoogleSub: jest.fn(), findByEmail: jest.fn(), createWithGoogle: jest.fn(),
}));
jest.mock('../src/services/token.service', () => ({}));
jest.mock('../src/services/pin.service', () => ({}));
jest.mock('google-auth-library', () => ({ OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken: jest.fn() })) }));
const google = require('../src/controllers/google-auth.controller');
const userModel = require('../src/models/user.model');
const { isValidPassword } = require('../src/services/password-policy.service');
const original = { node: process.env.NODE_ENV, registration: process.env.REGISTRATION_ENABLED };
afterEach(() => {
  if (original.node === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = original.node;
  if (original.registration === undefined) delete process.env.REGISTRATION_ENABLED; else process.env.REGISTRATION_ENABLED = original.registration;
  jest.clearAllMocks();
});
function response() {
  return { code: 200, body: null, status(n) { this.code=n;return this; }, json(x) { this.body=x;return this; } };
}
test('Google completion fails closed when production registration is disabled', async () => {
  process.env.NODE_ENV = 'production'; delete process.env.REGISTRATION_ENABLED;
  const res=response();
  await google.completeGoogleSignup({body:{}},res,()=>{throw new Error('unexpected next');});
  expect(res.code).toBe(403);
  expect(userModel.createWithGoogle).not.toHaveBeenCalled();
});
test('Google completion also fails closed if REGISTRATION_ENABLED is false', async () => {
  process.env.NODE_ENV='production'; process.env.REGISTRATION_ENABLED='false';
  const res=response();
  await google.completeGoogleSignup({body:{}},res,()=>{throw new Error('unexpected next');});
  expect(res.code).toBe(403);
});
test('password policy enforces 12 to 72 UTF-8 bytes consistently', () => {
  expect(isValidPassword('Aa123456')).toBe(false);
  expect(isValidPassword('Aa1234567890')).toBe(true);
  expect(isValidPassword('Aa'+'1'.repeat(71))).toBe(false);
  expect(isValidPassword('Aa'+'1'.repeat(70))).toBe(true);
  expect(isValidPassword('a'.repeat(12))).toBe(false);
});
