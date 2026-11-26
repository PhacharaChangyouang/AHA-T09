const bcrypt = require('bcryptjs');
const userModel = require('../models/user.model');
const tokenService = require('../services/token.service');
const loginSecurity = require('../services/login-security.service');
const pinService = require('../services/pin.service');
const pool = require('../config/db');

const PIN_LIMITS = { accountLimit: 5, networkLimit: 25 };
const DUMMY_PIN_HASH = bcrypt.hashSync('0000', 12);

function publicUser(user) {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    age: user.age,
    role: user.role,
    username: user.username || null,
    email: user.email || null,
    avatarUrl: user.avatar_url || null,
    authProvider: user.google_sub ? 'google' : 'local',
  };
}

function setAuthCookies(res, accessToken, refreshToken) {
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    priority: 'high',
  };
  res.cookie('accessToken', accessToken, { ...options, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...options, maxAge: 30 * 24 * 60 * 60 * 1000 });
}

async function issueSession(res, user) {
  const { accessToken, refreshToken } = await tokenService.issueSession(user);
  setAuthCookies(res, accessToken, refreshToken);
  return { accessToken, refreshToken };
}

async function loginWithPin(req, res, next) {
  try {
    const phone = String(req.body.phone || '').trim();
    const pin = String(req.body.pin || '');
    const throttleKey = `pin:${phone}`;
    if (!await loginSecurity.reserveAttempt(req, throttleKey, PIN_LIMITS)) {
      await loginSecurity.audit('pin_login_blocked', { success: false, req, identifier: phone });
      return res.status(429).json({ success: false, message: 'ลองเข้าระบบบ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่' });
    }

    const user = await userModel.findByPhone(phone);
    let verification;
    if (user?.pin_hash) verification = await pinService.verifyPin(pin, user.pin_hash);
    else {
      await bcrypt.compare(pin, DUMMY_PIN_HASH);
      verification = { valid: false, needsUpgrade: false };
    }

    if (!verification.valid) {
      await loginSecurity.audit('pin_login_failed', { userId: user?.id || null, success: false, req, identifier: phone });
      return res.status(401).json({ success: false, message: 'เบอร์โทรศัพท์หรือ PIN ไม่ถูกต้อง' });
    }

    if (verification.needsUpgrade) {
      const upgraded = await userModel.upgradeLegacyPin(user.id, user.pin_hash, await pinService.hashPin(pin), Number(user.session_version || 0));
      if (!upgraded) return res.status(409).json({ success: false, message: 'ข้อมูลบัญชีเปลี่ยนแล้ว กรุณาเข้าสู่ระบบใหม่' });
    }
    await loginSecurity.recordSuccess(req, throttleKey, PIN_LIMITS);
    const session = await issueSession(res, user);
    await loginSecurity.audit('pin_login_succeeded', { userId: user.id, success: true, req, identifier: phone });
    return res.json({ success: true, user: publicUser(user), ...session });
  } catch (error) {
    return next(error);
  }
}

async function changePin(req, res, next) {
  try {
    const { currentPin, newPin, confirmNewPin } = req.body;
    const throttleKey = `pin-change:${req.user.id}`;
    if (!await loginSecurity.reserveAttempt(req, throttleKey, PIN_LIMITS)) {
      await loginSecurity.audit('pin_change_blocked', { userId: req.user.id, success: false, req });
      return res.status(429).json({ success: false, message: 'ลองเปลี่ยน PIN บ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่' });
    }
    if (newPin !== confirmNewPin) return res.status(400).json({ success: false, message: 'PIN ใหม่และการยืนยัน PIN ไม่ตรงกัน' });
    if (currentPin === newPin) return res.status(400).json({ success: false, message: 'PIN ใหม่ต้องไม่ซ้ำกับ PIN ปัจจุบัน' });

    const user = await userModel.findById(req.user.id);
    const verification = await pinService.verifyPin(String(currentPin), user?.pin_hash);
    if (!user || !verification.valid) {
      await loginSecurity.audit('pin_change_failed', { userId: req.user.id, success: false, req });
      return res.status(403).json({ success: false, error: 'REAUTH_FAILED', message: 'PIN ปัจจุบันไม่ถูกต้อง' });
    }

    const pinHash = await pinService.hashPin(String(newPin));
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT pin_hash, session_version FROM users WHERE id = $1 FOR UPDATE', [user.id]);
      if (!rows[0] || rows[0].pin_hash !== user.pin_hash || Number(rows[0].session_version) !== Number(user.session_version || 0)) {
        const error = new Error('ข้อมูลบัญชีเปลี่ยนแล้ว กรุณาเข้าสู่ระบบและลองใหม่'); error.status = 409; throw error;
      }
      await userModel.updatePin(user.id, pinHash, client);
      await tokenService.revokeAllForUser(user.id, client);
      await client.query('COMMIT');
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw error;
    } finally { client.release(); }
    try { await loginSecurity.recordSuccess(req, throttleKey, PIN_LIMITS); } catch (_) { /* Keep the committed credential change successful. */ }
    await require('../services/account-security-notice.service').notify(user, 'pin_changed', req);
    await loginSecurity.audit('pin_change_succeeded', { userId: user.id, success: true, req });
    return res.json({ success: true, message: 'เปลี่ยน PIN เรียบร้อยแล้ว กรุณาเข้าสู่ระบบใหม่', reauthRequired: true });
  } catch (error) {
    return next(error);
  }
}

// Recovery requires an existing credential; email/contact fields never authorize it.
async function recoverPin(req, res, next) {
  const key = `pin-recovery:${req.user.id}`;
  try {
    if (!await loginSecurity.reserveAttempt(req, key, PIN_LIMITS)) return res.status(429).json({ success: false, message: 'ลองกู้ PIN บ่อยเกินไป กรุณารอ 15 นาที' });
    const { method, currentCredential, credential, newPin, confirmNewPin } = req.body || {};
    if (typeof newPin !== 'string' || !/^\d{4}$/.test(newPin) || newPin !== confirmNewPin)
      return res.status(400).json({ success: false, message: 'PIN ใหม่ต้องเป็นตัวเลข 4 หลักและตรงกันทั้งสองช่อง' });
    if (Object.keys(req.body).some(key => !['method', 'currentCredential', 'credential', 'newPin', 'confirmNewPin'].includes(key)))
      return res.status(400).json({ success: false, message: 'คำขอกู้ PIN มีข้อมูลที่ไม่รองรับ' });
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบใหม่' });
    let valid = false;
    if (method === 'password' && user.password_hash && typeof currentCredential === 'string'
      && currentCredential.length > 0 && Buffer.byteLength(currentCredential, 'utf8') <= 72)
      valid = await bcrypt.compare(currentCredential, user.password_hash);
    if (method === 'google' && user.google_sub) {
      try {
        const profile = await require('./google-auth.controller').verifyGoogleCredential(credential);
        valid = profile.sub === user.google_sub;
      } catch (error) {
        if (error.status === 503) throw error;
        valid = false;
      }
    }
    if (!valid) {
      await loginSecurity.audit('pin_recovery_failed', { success: false, userId: user.id, req });
      return res.status(403).json({ success: false, error: 'REAUTH_FAILED', message: 'ยืนยันตัวตนไม่สำเร็จ ใช้รหัสผ่าน AHA หรือ Google ที่เชื่อมไว้กับบัญชีนี้เท่านั้น' });
    }
    const pinHash = await pinService.hashPin(newPin);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [user.id]);
      const current = rows[0];
      if (!current || current.pin_hash !== user.pin_hash || current.password_hash !== user.password_hash
        || current.google_sub !== user.google_sub || Number(current.session_version) !== Number(user.session_version || 0)) {
        const error = new Error('ข้อมูลบัญชีเปลี่ยนแล้ว กรุณาเข้าสู่ระบบและยืนยันใหม่'); error.status = 409; throw error;
      }
      await userModel.updatePin(user.id, pinHash, client);
      await tokenService.revokeAllForUser(user.id, client);
      await client.query('COMMIT');
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw error;
    } finally { client.release(); }
    try { await loginSecurity.recordSuccess(req, key, PIN_LIMITS); } catch (_) { /* Credential change has committed. */ }
    await require('../services/account-security-notice.service').notify(user, 'pin_recovered', req);
    await loginSecurity.audit('pin_recovery_succeeded', { success: true, userId: user.id, req });
    return res.json({ success: true, reauthRequired: true, message: 'ตั้ง PIN ใหม่แล้ว กรุณาเข้าสู่ระบบใหม่ทุกอุปกรณ์' });
  } catch (error) { next(error); }
}

module.exports = { loginWithPin, changePin, recoverPin };
