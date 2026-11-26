const logger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.message === 'Not allowed by CORS' ? 403 : (err.statusCode || err.status || 500);
  // Error messages, stack traces and request paths may contain credentials or health data.
  logger.error('Auth request failed', { status: Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500 });
  res.status(status).json({
    success: false,
    message: status === 500 ? 'Internal server error' : err.message,
  });
}

module.exports = errorHandler;
