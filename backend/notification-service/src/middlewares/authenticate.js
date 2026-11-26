const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function isInternalKeyValid(provided) {
  const expected = process.env.INTERNAL_API_KEY;
  if (typeof provided !== 'string' || typeof expected !== 'string' || expected.length < 32) return false;
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    let [name, ...rest] = cookie.split('=');
    name = name?.trim();
    if (!name) return;
    const value = rest.join('=').trim();
    if (!value) return;
    try { list[name] = decodeURIComponent(value); } catch (_) { return; }
  });
  return list;
}

module.exports = async function authenticate(req, res, next) {
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader && /^Bearer [^\s]+$/.test(authHeader)) {
    token = authHeader.slice(7);
  } else if (req.headers.cookie) {
    const cookies = parseCookies(req.headers.cookie);
    if (cookies.accessToken) {
      token = cookies.accessToken;
    }
  }

  const internalKey = req.headers['x-internal-api-key'];
  if (isInternalKeyValid(internalKey)) {
    req.user = { id: 'system', role: 'system' };
    return next();
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Missing token' });
  }

  try {
    if (token.length > 4096) throw new Error('Token too long');
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'], issuer: 'aha-auth-service', audience: 'aha-api', clockTolerance: 5,
    });
    const authUrl = process.env.AUTH_SERVICE_URL;
    const internalKey = process.env.INTERNAL_API_KEY;
    if (!authUrl || !internalKey) return res.status(503).json({ success: false, message: 'Session verification unavailable' });
    try {
      const check = await fetch(`${authUrl.replace(/\/$/, '')}/auth/internal/session`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-internal-api-key': internalKey },
        body: JSON.stringify({ token }), signal: AbortSignal.timeout(3000), redirect: 'error',
      });
      if (!check.ok) throw new Error('Session verification unavailable');
      if ((await check.json()).active !== true) return res.status(401).json({ success: false, message: 'Unauthorized: Session revoked' });
    } catch (_) { return res.status(503).json({ success: false, message: 'Session verification unavailable' }); }
    req.user = {
      id: payload.id,
      phone: payload.phone,
      role: payload.role
    };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid or expired token' });
  }
};
