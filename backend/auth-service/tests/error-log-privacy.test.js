jest.mock('../src/utils/logger', () => ({ error: jest.fn() }));
const logger = require('../src/utils/logger');
const errorHandler = require('../src/middlewares/errorHandler');

beforeEach(() => jest.clearAllMocks());
test('logs only a fixed event and status, not exception or request details', () => {
  const err = new Error('synthetic-private-value');
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  errorHandler(err, { path: '/synthetic-private-path' }, res, jest.fn());
  expect(logger.error).toHaveBeenCalledWith('Auth request failed', { status: 500 });
  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Internal server error' });
});
test('CORS rejection retains 403 without logging request details', () => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  errorHandler(new Error('Not allowed by CORS'), { path: '/synthetic-private-path' }, res, jest.fn());
  expect(logger.error).toHaveBeenCalledWith('Auth request failed', { status: 403 });
  expect(res.status).toHaveBeenCalledWith(403);
});
