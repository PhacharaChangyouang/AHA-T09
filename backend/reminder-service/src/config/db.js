const { Pool } = require('pg');

const { academicDbConfig } = require('./academic-db');
const connection = academicDbConfig('reminder');

const pool = new Pool({
  ...connection,
  ...(process.env.NODE_ENV === 'production'
    && process.env.DB_SSL !== 'false'
    ? { ssl: {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
        ...(process.env.DB_CA_CERT ? { ca: process.env.DB_CA_CERT.replace(/\\n/g, '\n') } : {}),
      } }
    : {}),
  max: Number(process.env.DB_POOL_MAX || 10),
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  statement_timeout: 10000,
  query_timeout: 12000,
});

module.exports = pool;
