require('dotenv').config();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');

/**
 * Refresh token ถูกเก็บใน DB แบบ hash (sha256) เท่านั้น ไม่เก็บ token ดิบ
 * เหตุผล: ถ้า DB รั่ว จะไม่สามารถเอา hash ไปใช้ล็อกอินแทน user ได้เลย
 * (ต่างจากรหัสผ่านที่คนพิมพ์เอง/สั้น/เดาได้ที่ต้อง bcrypt
 *  แต่ refresh token เป็น random string ที่มี entropy สูงอยู่แล้ว sha256 พอ
 *  และเร็วกว่า bcrypt มากเวลาต้อง lookup ด้วย token ทุก request)
 */

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateAccessToken(user, sessionId) {
  return jwt.sign(
    {
      id: user.id,
      phone: user.phone,
      role: user.role,
      jti: crypto.randomUUID(),
      sv: Number(user.session_version || 0),
      ...(sessionId ? { sid: sessionId } : {}),
    },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      issuer: 'aha-auth-service',
      audience: 'aha-api',
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    }
  );
}

async function generateRefreshToken(user, database = pool, sessionId) {
  const token = jwt.sign(
    {
      id: user.id,
      phone: user.phone,
      role: user.role,
      jti: crypto.randomUUID(),
      sv: Number(user.session_version || 0),
      ...(sessionId ? { sid: sessionId } : {}),
    },
    process.env.JWT_REFRESH_SECRET,
    {
      algorithm: 'HS256',
      issuer: 'aha-auth-service',
      audience: 'aha-refresh',
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    }
  );

  const decoded = jwt.decode(token);
  const expiresAt = new Date(decoded.exp * 1000);

  await database.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, hashToken(token), expiresAt]
  );

  return token;
}

function verifyToken(token, secret, audience) {
  try {
    if (typeof token !== 'string' || token.length > 4096) return null;
    return jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: 'aha-auth-service',
      audience,
      clockTolerance: 5,
    });
  } catch (err) {
    return null;
  }
}

function verifyAccessToken(token) {
  return verifyToken(token, process.env.JWT_SECRET, 'aha-api');
}

function verifyRefreshToken(token) {
  return verifyToken(token, process.env.JWT_REFRESH_SECRET, 'aha-refresh');
}

async function isSessionActive(payload, database = pool) {
  if (!payload?.id || !Number.isInteger(payload.sv ?? 0)) return false;
  const { rows } = await database.query(`
    SELECT u.session_version, s.id AS session_id
    FROM users u
    LEFT JOIN auth_sessions s ON s.id = $2 AND s.user_id = u.id
      AND s.revoked_at IS NULL AND s.expires_at > now()
      AND s.session_version = u.session_version
    WHERE u.id = $1
  `, [payload.id, payload.sid || null]);
  const user = rows[0];
  if (!user || Number(user.session_version) !== (payload.sv ?? 0)) return false;
  // Existing signed sessions remain valid until expiry or an explicit revocation.
  return payload.sid ? Boolean(user.session_id) : Number(user.session_version) === 0;
}

async function issueSession(user) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT session_version FROM users WHERE id = $1 FOR SHARE', [user.id]);
    if (!rows[0] || Number(rows[0].session_version) !== Number(user.session_version || 0)) {
      const error = new Error('ข้อมูลเข้าสู่ระบบเปลี่ยนแล้ว กรุณาเข้าสู่ระบบใหม่');
      error.status = 401;
      throw error;
    }
    const sid = crypto.randomUUID();
    const refreshToken = await generateRefreshToken(user, client, sid);
    await client.query(`INSERT INTO auth_sessions (id, user_id, session_version, expires_at)
      VALUES ($1, $2, $3, $4)`, [sid, user.id, Number(user.session_version || 0), new Date(jwt.decode(refreshToken).exp * 1000)]);
    const accessToken = generateAccessToken(user, sid);
    await client.query('COMMIT');
    return { accessToken, refreshToken };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw error;
  } finally { client.release(); }
}

// ยังไม่หมดอายุ และยังไม่ถูก revoke (logout/ใช้ไปแล้ว)
async function isRefreshTokenValid(token, database = pool) {
  const { rows } = await database.query(
    `SELECT id FROM refresh_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
    [hashToken(token)]
  );
  return rows.length > 0;
}

async function revokeRefreshToken(token) {
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = now()
     WHERE token_hash = $1 AND revoked_at IS NULL`,
    [hashToken(token)]
  );
}

// Rotation is one transaction: failed issuance rolls back revocation as well.
// The conditional UPDATE serializes competing refreshes across service replicas.
async function rotateRefreshSession(token, user) {
  const payload = verifyRefreshToken(token);
  if (!payload || payload.id !== user.id) return null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM users WHERE id = $1 FOR SHARE', [user.id]);
    if (!await isSessionActive(payload, client)) {
      await client.query('ROLLBACK');
      return null;
    }
    const result = await client.query(
      `UPDATE refresh_tokens SET revoked_at = now()
       WHERE token_hash = $1 AND user_id = $2
         AND revoked_at IS NULL AND expires_at > now()
       RETURNING id`,
      [hashToken(token), user.id]
    );
    if (result.rowCount !== 1) {
      await client.query('ROLLBACK');
      return null;
    }
    const sid = payload.sid || crypto.randomUUID();
    const currentUser = { ...user, session_version: payload.sv ?? 0 };
    const accessToken = generateAccessToken(currentUser, sid);
    const refreshToken = await generateRefreshToken(currentUser, client, sid);
    await client.query(`INSERT INTO auth_sessions (id, user_id, session_version, expires_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET expires_at = EXCLUDED.expires_at`,
    [sid, user.id, payload.sv ?? 0, new Date(jwt.decode(refreshToken).exp * 1000)]);
    await client.query('COMMIT');
    return { accessToken, refreshToken };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw error;
  } finally {
    client.release();
  }
}

// เรียกตอน logout "ออกจากทุกอุปกรณ์" หรือลบ user
async function revokeAllForUser(userId, database) {
  if (!database) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await revokeAllForUser(userId, client);
      await client.query('COMMIT');
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw error;
    } finally { client.release(); }
    return;
  }
  await database.query('UPDATE users SET session_version = session_version + 1 WHERE id = $1', [userId]);
  await database.query('UPDATE auth_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
  await database.query(
    `UPDATE refresh_tokens SET revoked_at = now()
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
}

async function revokeSession(refreshToken, accessToken) {
  const accessPayload = verifyAccessToken(accessToken);
  const refreshPayload = verifyRefreshToken(refreshToken);
  const candidate = accessPayload || refreshPayload;
  if (!candidate) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Match the lock order used by refresh and password/PIN changes.
    await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [candidate.id]);
    let payload = null;
    if (accessPayload && await isSessionActive(accessPayload, client)) payload = accessPayload;
    else if (refreshPayload && refreshPayload.id === candidate.id
      && await isSessionActive(refreshPayload, client)
      && await isRefreshTokenValid(refreshToken, client)) payload = refreshPayload;
    if (!payload) { await client.query('ROLLBACK'); return; }
    if (!payload.sid) {
      await revokeAllForUser(payload.id, client);
      await client.query('COMMIT');
      return;
    }
    await client.query('UPDATE auth_sessions SET revoked_at = now() WHERE id = $1 AND user_id = $2', [payload.sid, payload.id]);
    if (refreshToken && refreshPayload?.id === payload.id && refreshPayload.sid === payload.sid) {
      await client.query('UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND user_id = $2', [hashToken(refreshToken), payload.id]);
    }
    await client.query('COMMIT');
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw error;
  } finally { client.release(); }
}

module.exports = {
  generateAccessToken,
  issueSession,
  isSessionActive,
  revokeSession,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  isRefreshTokenValid,
  revokeRefreshToken,
  rotateRefreshSession,
  revokeAllForUser,
};

