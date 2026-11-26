const { Pool } = require('pg');
const logger = require('../utils/logger');

const { academicDbConfig } = require('./academic-db');
const connection = academicDbConfig('auth');
const ssl = process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false'
  ? {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
      ...(process.env.DB_CA_CERT ? { ca: process.env.DB_CA_CERT.replace(/\\n/g, '\n') } : {}),
    }
  : undefined;

const pool = new Pool({
  ...connection,
  ...(ssl ? { ssl } : {}),
  max: Number(process.env.DB_POOL_MAX || 10),
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  statement_timeout: 10000,
  query_timeout: 12000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle DB client');
});

module.exports = pool;
