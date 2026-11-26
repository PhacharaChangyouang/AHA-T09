const crypto = require('crypto');
const pool = require('../config/db');
const users = require('../models/user.model');
const pins = require('../services/pin.service');
const tokens = require('../services/token.service');
const recovery = require('../services/pin-reset.service');
const limits = require('../services/password-reset-rate-limit.service');
const security = require('../services/login-security.service');
const notice = require('../services/account-security-notice.service');

const GENERIC = 'ถ้าอีเมลนี้ผูกกับบัญชี AHA ที่มี PIN ระบบจะส่งลิงก์ตั้ง PIN ใหม่ให้';
const INVALID = 'ลิงก์หมดอายุ ถูกใช้แล้ว หรือข้อมูลบัญชีเปลี่ยน กรุณาขอลิงก์ใหม่';

async function requestReset(req, res, next) {
  const startedAt = Date.now();
  try {
    if (typeof req.body?.email !== 'string' || req.body.email.length > 254 || !/^\S+@\S+\.\S+$/.test(req.body.email.trim())) return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมลให้ถูกต้อง' });
    const email = req.body.email.trim().toLowerCase();
    const limit = await limits.consume(req, email);
    const user = await users.findByEmail(email);
    if (user?.pin_hash) await recovery.issue(user.id);
    const remaining = 800 + crypto.randomInt(201) - (Date.now() - startedAt);
    if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
    return res.json({ success: true, message: GENERIC, cooldownSeconds: limit.cooldownSeconds });
  } catch (error) {
    if (error.status === 429) {
      res.set('Retry-After', String(error.retryAfterSeconds));
      return res.status(429).json({ success: false, message: error.message, retryAfterSeconds: error.retryAfterSeconds });
    }
    next(error);
  }
}

async function resetPin(req, res, next) {
  try {
    const { token, newPin, confirmNewPin } = req.body || {};
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ success: false, message: INVALID });
    if (typeof newPin !== 'string' || !/^\d{4}$/.test(newPin) || newPin !== confirmNewPin) return res.status(400).json({ success: false, message: 'กรอก PIN 4 หลักให้ตรงกันทั้งสองช่อง' });
    if (Object.keys(req.body).some(key => !['token', 'newPin', 'confirmNewPin'].includes(key))) return res.status(400).json({ success: false, message: 'คำขอมีข้อมูลที่ไม่รองรับ' });
    const tokenHash = recovery.hashToken(token);
    const pinHash = await pins.hashPin(newPin);
    const client = await pool.connect();
    let user;
    try {
      await client.query('BEGIN');
      const grant = (await client.query('SELECT user_id, credential_stamp FROM pin_reset_tokens WHERE token_hash = $1 AND used_at IS NULL AND expires_at > clock_timestamp()', [tokenHash])).rows[0];
      if (grant) user = (await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [grant.user_id])).rows[0];
      if (!user || recovery.credentialStamp(user) !== grant.credential_stamp) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: INVALID });
      }
      const used = await client.query('UPDATE pin_reset_tokens SET used_at = now() WHERE token_hash = $1 AND used_at IS NULL AND expires_at > clock_timestamp() RETURNING id', [tokenHash]);
      if (used.rowCount !== 1) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: INVALID });
      }
      if (!await users.updatePin(user.id, pinHash, client)) throw new Error('PIN recovery account unavailable');
      await tokens.revokeAllForUser(user.id, client);
      await client.query('DELETE FROM pin_reset_tokens WHERE user_id = $1 AND id <> $2', [user.id, used.rows[0].id]);
      await client.query('COMMIT');
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw error;
    } finally { client.release(); }
    // A user may have exhausted PIN retries while the previous pepper was invalid.
    try { await security.clearForAccount(`pin:${user.phone}`); } catch (_) {}
    await notice.notify(user, 'pin_recovered', req);
    await security.audit('pin_email_recovery_succeeded', { userId: user.id, success: true, req });
    return res.json({ success: true, reauthRequired: true, message: 'ตั้ง PIN ใหม่แล้ว กรุณาเข้าสู่ระบบด้วยเบอร์เดิมและ PIN ที่เพิ่งตั้ง' });
  } catch (error) { next(error); }
}

module.exports = { requestReset, resetPin };
