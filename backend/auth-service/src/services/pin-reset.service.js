const crypto = require('crypto');
const pool = require('../config/db');
const budget = require('./password-reset-rate-limit.service');
const email = require('./email.service');

const RESET_MINUTES = 15;
const hashToken = value => crypto.createHash('sha256').update(value).digest('hex');
const credentialStamp = user => hashToken(JSON.stringify([user.id, String(user.email || '').toLowerCase(), user.pin_hash, Number(user.session_version || 0)]));

async function issue(userId, reason = 'requested') {
  if (!['requested', 'security_update'].includes(reason)) throw new Error('Unsupported recovery reason');
  if (!await budget.reserveEmailDelivery()) return { accepted: false, reason: 'budget' };
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const client = await pool.connect();
  let user;
  try {
    await client.query('BEGIN');
    user = (await client.query('SELECT id, email, name, pin_hash, session_version FROM users WHERE id = $1 FOR UPDATE', [userId])).rows[0];
    if (!user?.pin_hash || !/^\S+@\S+\.\S+$/.test(user.email || '')) {
      await client.query('ROLLBACK');
      return { accepted: false, reason: 'unavailable' };
    }
    await client.query('DELETE FROM pin_reset_tokens WHERE user_id = $1', [user.id]);
    await client.query(`INSERT INTO pin_reset_tokens (user_id, token_hash, credential_stamp, expires_at)
      VALUES ($1, $2, $3, now() + ($4 * interval '1 minute'))`, [user.id, tokenHash, credentialStamp(user), RESET_MINUTES]);
    await client.query('COMMIT');
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw error;
  } finally { client.release(); }
  try {
    await email.sendPinResetEmail({ to: user.email, name: user.name, token, reason });
    return { accepted: true };
  } catch (_) {
    // Never print provider bodies, recipients, links, PINs, or bearer tokens.
    await pool.query('DELETE FROM pin_reset_tokens WHERE token_hash = $1', [tokenHash]);
    return { accepted: false, reason: 'delivery_unconfirmed' };
  }
}

module.exports = { issue, credentialStamp, hashToken, RESET_MINUTES };
