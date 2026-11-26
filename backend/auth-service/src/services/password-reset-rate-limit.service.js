const crypto = require('crypto');
const pool = require('../config/db');

const COOLDOWN_SECONDS = 2 * 60;
const DAILY_MAX = 3;
const IP_DAILY_MAX = 30;
const IP_COOLDOWN_SECONDS = 5;
const DAILY_WINDOW_SECONDS = 24 * 60 * 60;

function hashKey(value) {
  const secret = process.env.JWT_SECRET || process.env.GOOGLE_SIGNUP_SECRET || 'aha-password-reset-rate-limit';
  return crypto.createHmac('sha256', secret).update(String(value)).digest('hex');
}

function clientIp(req) {
  return String(req.ip || req.socket?.remoteAddress || 'unknown').trim().toLowerCase();
}

function retryError(message, retryAfterSeconds) {
  const error = new Error(message);
  error.status = 429;
  error.retryAfterSeconds = Math.max(1, Math.ceil(retryAfterSeconds));
  return error;
}

async function consume(req, email) {
  const keys = [
    { type: 'email', hash: hashKey(`email:${email}`) },
    { type: 'ip', hash: hashKey(`ip:${clientIp(req)}`) },
  ];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Lock in a stable order so simultaneous requests cannot bypass limits.
    for (const key of [...keys].sort((a, b) => a.hash.localeCompare(b.hash))) {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${key.type}:${key.hash}`]);
    }

    for (const key of keys) {
      const { rows } = await client.query(`
        SELECT
          EXTRACT(EPOCH FROM (now() - MAX(requested_at))) AS seconds_since_last,
          COUNT(*) FILTER (WHERE requested_at > now() - interval '24 hours')::int AS daily_count,
          EXTRACT(EPOCH FROM (MIN(requested_at) FILTER (WHERE requested_at > now() - interval '24 hours') + interval '24 hours' - now())) AS daily_retry
        FROM password_reset_attempts
        WHERE key_type = $1 AND key_hash = $2
          AND requested_at > now() - interval '24 hours'
      `, [key.type, key.hash]);
      const stats = rows[0] || {};
      const sinceLast = stats.seconds_since_last == null ? Number.NaN : Number(stats.seconds_since_last);
      const cooldown = key.type === 'email' ? COOLDOWN_SECONDS : IP_COOLDOWN_SECONDS;
      const dailyMax = key.type === 'email' ? DAILY_MAX : IP_DAILY_MAX;
      if (Number.isFinite(sinceLast) && sinceLast < cooldown) {
        throw retryError('กรุณารอสักครู่ก่อนขอลิงก์ใหม่', cooldown - sinceLast);
      }
      if (Number(stats.daily_count || 0) >= dailyMax) {
        throw retryError('คุณทำรายการเกินจำนวนที่กำหนด กรุณาลองใหม่ในภายหลัง', Number(stats.daily_retry) || DAILY_WINDOW_SECONDS);
      }
    }

    for (const key of keys) {
      await client.query('INSERT INTO password_reset_attempts (key_type, key_hash) VALUES ($1, $2)', [key.type, key.hash]);
    }
    await client.query('COMMIT');
    return { cooldownSeconds: COOLDOWN_SECONDS };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function reserveEmailDelivery() {
  const configured = Number(process.env.PASSWORD_RESET_GLOBAL_DAILY_MAX || 80);
  const dailyMax = Number.isInteger(configured) && configured > 0 ? configured : 80;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('aha-password-reset-email-budget'))");
    const { rows } = await client.query("SELECT COUNT(*)::int AS count FROM auth_email_budget WHERE created_at > now() - interval '24 hours'");
    if (Number(rows[0]?.count || 0) >= dailyMax) {
      await client.query('ROLLBACK');
      return false;
    }
    await client.query('INSERT INTO auth_email_budget DEFAULT VALUES');
    await client.query('COMMIT');
    return true;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw error;
  } finally { client.release(); }
}

module.exports = { consume, reserveEmailDelivery, COOLDOWN_SECONDS, DAILY_MAX, IP_DAILY_MAX, IP_COOLDOWN_SECONDS };
