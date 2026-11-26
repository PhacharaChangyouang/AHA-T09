const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../config/db');
const userModel = require('../models/user.model');
const tokenService = require('../services/token.service');
const emailService = require('../services/email.service');
const resetRateLimit = require('../services/password-reset-rate-limit.service');

const SALT_ROUNDS = 12;
const RESET_MINUTES = 15;
const { isValidPassword, PASSWORD_MESSAGE } = require('../services/password-policy.service');

function hashResetToken(token) { return crypto.createHash('sha256').update(token).digest('hex'); }
async function uniformResetDelay(startedAt) {
  const targetMs = 800 + crypto.randomInt(0, 201);
  const remaining = targetMs - (Date.now() - startedAt);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
}

async function requestReset(req, res, next) {
  const startedAt = Date.now();
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมลให้ถูกต้อง' });
    const rateLimit = await resetRateLimit.consume(req, email);
    const user = await userModel.findByEmail(email);
    if (!user || !await resetRateLimit.reserveEmailDelivery()) {
      await uniformResetDelay(startedAt);
      return res.json({ success: true, message: 'ถ้าอีเมลนี้มีบัญชี AHA ระบบจะส่งลิงก์ให้', cooldownSeconds: rateLimit.cooldownSeconds });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(rawToken);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [user.id]);
      await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);
      await client.query(`INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, now() + ($3 * interval '1 minute'))`, [user.id, tokenHash, RESET_MINUTES]);
      await client.query('COMMIT');
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw error;
    } finally { client.release(); }

    try {
      await emailService.sendPasswordResetEmail({ to: user.email, name: user.name, token: rawToken });
    } catch (emailError) {
      await pool.query('DELETE FROM password_reset_tokens WHERE token_hash = $1', [tokenHash]);
      console.error('Password reset email failed:', emailError.message);
    }

    await uniformResetDelay(startedAt);
    res.json({ success: true, message: 'ถ้าอีเมลนี้มีบัญชี AHA ระบบจะส่งลิงก์ให้', cooldownSeconds: rateLimit.cooldownSeconds });
  } catch (err) {
    if (err.status === 429) {
      res.set('Retry-After', String(err.retryAfterSeconds));
      return res.status(429).json({ success: false, message: err.message, retryAfterSeconds: err.retryAfterSeconds });
    }
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password, confirmPassword } = req.body;
    if (!/^[0-9a-f]{64}$/i.test(String(token || ''))) return res.status(400).json({ success: false, message: 'ลิงก์ตั้งรหัสผ่านไม่ถูกต้อง' });
    if (password !== confirmPassword) return res.status(400).json({ success: false, message: 'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน' });
    if (!isValidPassword(password)) return res.status(400).json({ success: false, message: PASSWORD_MESSAGE });

    const passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);
    const tokenHash = hashResetToken(String(token));
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const found = await client.query('SELECT user_id FROM password_reset_tokens WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()', [tokenHash]);
      const userId = found.rows[0]?.user_id;
      if (!userId) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'ลิงก์หมดอายุหรือถูกใช้งานแล้ว กรุณาขอลิงก์ใหม่' });
      }
      await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
      const used = await client.query('UPDATE password_reset_tokens SET used_at = now() WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() RETURNING id', [tokenHash]);
      if (used.rowCount !== 1) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'ลิงก์หมดอายุหรือถูกใช้งานแล้ว กรุณาขอลิงก์ใหม่' });
      }
      const user = await userModel.updatePassword(userId, passwordHash, client);
      if (!user) throw new Error('Password recovery account unavailable');
      await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1 AND id <> $2', [userId, used.rows[0].id]);
      await tokenService.revokeAllForUser(userId, client);
      await client.query('COMMIT');
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw error;
    } finally { client.release(); }

    res.json({ success: true, message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' });
  } catch (err) { next(err); }
}

module.exports = { requestReset, resetPassword };
