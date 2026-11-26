import { NextResponse } from 'next/server';
import { academicServiceOrigin, academicFrontendOrigin } from '../../../../../lib/academic-origin.mjs';

const isProduction = process.env.NODE_ENV === 'production';

const SERVICE_URLS = {
  auth: academicServiceOrigin('auth', process.env.AUTH_API_URL),
  reminder: academicServiceOrigin('reminder', process.env.REMINDER_API_URL),
  notification: academicServiceOrigin('notification', process.env.NOTIFICATION_API_URL),
};

const PUBLIC_AUTH_PATHS = new Set([
  'auth/login-password',
  'auth/login',
  'auth/register-password',
  'auth/forgot-password',
  'auth/reset-password',
  'auth/forgot-pin-email',
  'auth/reset-pin-email',
  'auth/google',
  'auth/google/complete',
]);

const ROUTES = {
  auth: [
    ['POST', /^auth\/(login|login-password|register-password|forgot-password|reset-password|forgot-pin-email|reset-pin-email|google|google\/complete|google\/link|google\/link-challenge|logout|me\/change-pin|me\/recover-pin)$/],
    ['GET', /^auth\/me$/],
    ['GET', /^auth\/session$/],
    ['PATCH', /^auth\/me$/],
    ['GET', /^family\/(connections|linked-elderly)$/],
    ['POST', /^family\/connections$/],
    ['PATCH', /^family\/connections\/[0-9a-f-]{36}$/i],
    ['DELETE', /^family\/connections\/[0-9a-f-]{36}$/i],
  ],
  reminder: [
    ['GET', /^api\/reminders(?:\/today|\/[0-9a-f-]{36})?$/i],
    ['POST', /^api\/reminders(?:\/[0-9a-f-]{36}\/(taken|snooze))?$/i],
    ['PUT', /^api\/reminders\/[0-9a-f-]{36}$/i],
    ['PATCH', /^api\/reminders\/[0-9a-f-]{36}\/status$/i],
    ['DELETE', /^api\/reminders\/[0-9a-f-]{36}$/i],
    ['GET', /^api\/caregiver\/summary$/],
    ['GET', /^api\/caregiver\/reports(?:\/preferences)?$/],
    ['PUT', /^api\/caregiver\/reports\/preferences$/],
    ['POST', /^api\/caregiver\/reports\/open$/],
    ['POST', /^api\/caregiver\/reminders$/],
    ['PUT', /^api\/caregiver\/reminders\/[0-9a-f-]{36}$/i],
    ['DELETE', /^api\/caregiver\/reminders\/[0-9a-f-]{36}$/i],
  ],
  notification: [
    ['GET', /^api\/(notifications(?:\/unread|\/[0-9a-f-]{36})?|push\/status)$/i],
    ['POST', /^api\/(push\/receipt|notifications|notifications\/emergency|push\/subscribe|support\/contact)$/],
    ['PATCH', /^api\/notifications\/(read-all|[0-9a-f-]{36}\/read)$/i],
    ['DELETE', /^api\/(notifications\/[0-9a-f-]{36}|push\/subscribe)$/i],
  ],
};

const accessCookie = isProduction ? '__Host-aha-access' : 'aha-access';
const refreshCookie = isProduction ? '__Host-aha-refresh' : 'aha-refresh';
const refreshInFlight = new Map();

// Cookies must not outlive their signed JWTs, including when production TTL differs from defaults.
function tokenCookieAge(token, ceiling) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return 0;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (!Number.isSafeInteger(payload.exp)) return 0;
    return Math.max(0, Math.min(ceiling, payload.exp - Math.floor(Date.now() / 1000)));
  } catch { return 0; }
}

function cookieOptions(maxAge) {
  return { httpOnly: true, secure: isProduction, sameSite: 'strict', path: '/', priority: 'high', maxAge };
}

function isAllowed(service, method, path) {
  return Boolean(ROUTES[service]?.some(([allowedMethod, pattern]) => allowedMethod === method && pattern.test(path)));
}

function isSameOriginMutation(request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && !['same-origin', 'none'].includes(fetchSite)) return false;
  if (!origin) return false;
  const expected = academicFrontendOrigin(process.env.FRONTEND_URL);
  return Boolean(expected && origin === expected);
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { success: false, message: 'Invalid upstream response' }; }
}

function safeResponse(payload, status, session = null, clear = false) {
  const response = NextResponse.json(payload, { status });
  response.headers.set('Cache-Control', 'no-store');
  if (session?.accessToken) response.cookies.set(accessCookie, session.accessToken, cookieOptions(tokenCookieAge(session.accessToken, 15 * 60)));
  if (session?.refreshToken) response.cookies.set(refreshCookie, session.refreshToken, cookieOptions(tokenCookieAge(session.refreshToken, 30 * 24 * 60 * 60)));
  if (clear) {
    response.cookies.set(accessCookie, '', cookieOptions(0));
    response.cookies.set(refreshCookie, '', cookieOptions(0));
  }
  return response;
}

async function callUpstream(url, method, body, token) {
  return fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

async function refreshSession(request) {
  const token = request.cookies.get(refreshCookie)?.value;
  if (!token) return null;
  if (!SERVICE_URLS.auth) throw new Error('Academic Auth origin rejected');
  const active = refreshInFlight.get(token);
  if (active) return active;
  const operation = (async () => {
    const response = await callUpstream(`${SERVICE_URLS.auth}/auth/refresh`, 'POST', { refreshToken: token });
    if (response.status === 429 || response.status >= 500) throw new Error('Session refresh temporarily unavailable');
    if (!response.ok) return null;
    const payload = await readJson(response);
    return payload.accessToken && payload.refreshToken ? payload : null;
  })();
  refreshInFlight.set(token, operation);
  try { return await operation; } finally { refreshInFlight.delete(token); }
}

async function handler(request, context) {
  const { service, path: pathParts } = await context.params;
  const path = Array.isArray(pathParts) ? pathParts.join('/') : '';
  if (!Object.hasOwn(SERVICE_URLS, service) || !isAllowed(service, request.method, path)) {
    return safeResponse({ success: false, message: 'Not found' }, 404);
  }
  if (!SERVICE_URLS[service]) {
    return safeResponse({ success: false, message: 'Service unavailable' }, 503);
  }
  if (!isSameOriginMutation(request) || (request.method !== 'GET' && request.headers.get('x-aha-request') !== '1')) {
    return safeResponse({ success: false, message: 'Cross-site request rejected' }, 403);
  }

  let body;
  if (!['GET', 'HEAD'].includes(request.method)) {
    const text = await request.text();
    if (text.length > 32768) return safeResponse({ success: false, message: 'Request body too large' }, 413);
    if (text) {
      try { body = JSON.parse(text); } catch { return safeResponse({ success: false, message: 'Invalid JSON' }, 400); }
    }
  }

  const isLogin = service === 'auth' && ['auth/login', 'auth/login-password', 'auth/register-password', 'auth/google', 'auth/google/complete'].includes(path);
  const isLogout = service === 'auth' && path === 'auth/logout';
  const isSessionCheck = service === 'auth' && path === 'auth/session' && request.method === 'GET';
  const isPushReceipt = service === 'notification' && path === 'api/push/receipt' && request.method === 'POST';
  // Receipt capabilities authorize only one device/message acknowledgement.
  const isPublic = isPushReceipt || (service === 'auth' && PUBLIC_AUTH_PATHS.has(path));
  const query = new URL(request.url).search;
  const upstreamPath = isSessionCheck ? 'auth/me' : path;
  const upstreamUrl = `${SERVICE_URLS[service].replace(/\/$/, '')}/${upstreamPath}${query}`;
  let accessToken = request.cookies.get(accessCookie)?.value || null;

  if (isSessionCheck) {
    const hasRefreshToken = Boolean(request.cookies.get(refreshCookie)?.value);
    if (!accessToken && !hasRefreshToken) {
      return safeResponse({ success: true, authenticated: false }, 200);
    }

    let rotatedSession = null;
    if (!accessToken) {
      rotatedSession = await refreshSession(request);
      accessToken = rotatedSession?.accessToken || null;
    }
    if (!accessToken) {
      return safeResponse({ success: true, authenticated: false }, 200, null, true);
    }

    let upstream = await callUpstream(upstreamUrl, 'GET', undefined, accessToken);
    if (upstream.status === 401 && !rotatedSession && hasRefreshToken) {
      rotatedSession = await refreshSession(request);
      if (rotatedSession?.accessToken) upstream = await callUpstream(upstreamUrl, 'GET', undefined, rotatedSession.accessToken);
    }
    if (!upstream.ok) {
      if (upstream.status !== 401 && upstream.status !== 404) {
        return safeResponse({ success: false, message: 'Session verification temporarily unavailable' }, 503);
      }
      return safeResponse({ success: true, authenticated: false }, 200, null, true);
    }
    const payload = await readJson(upstream);
    return safeResponse({ success: true, authenticated: true, user: payload.user || null }, 200, rotatedSession);
  }

  if (isLogout) {
    body = { refreshToken: request.cookies.get(refreshCookie)?.value || null, accessToken };
  } else if (!isPublic && !accessToken) {
    const session = await refreshSession(request);
    if (!session) return safeResponse({ success: false, message: 'Unauthorized' }, 401, null, true);
    accessToken = session.accessToken;
    const upstream = await callUpstream(upstreamUrl, request.method, body, accessToken);
    const payload = await readJson(upstream);
    delete payload.accessToken;
    delete payload.refreshToken;
    return safeResponse(payload, upstream.status, session, payload.reauthRequired === true || upstream.status === 401);
  }

  let upstream = await callUpstream(upstreamUrl, request.method, body, accessToken);
  let rotatedSession = null;
  if (upstream.status === 401 && !isPublic && !isLogout) {
    rotatedSession = await refreshSession(request);
    if (rotatedSession) upstream = await callUpstream(upstreamUrl, request.method, body, rotatedSession.accessToken);
  }

  const payload = await readJson(upstream);
  if (isLogin || payload.accessToken || payload.refreshToken) {
    rotatedSession = {
      accessToken: payload.accessToken || rotatedSession?.accessToken,
      refreshToken: payload.refreshToken || rotatedSession?.refreshToken,
    };
    delete payload.accessToken;
    delete payload.refreshToken;
  }
  return safeResponse(payload, upstream.status, rotatedSession, isLogout || payload.reauthRequired === true || upstream.status === 401);
}

async function guardedHandler(request, context) {
  try {
    return await handler(request, context);
  } catch (error) {
    console.error('BFF upstream request failed', { method: request.method, cause: error?.name || 'Error' });
    return safeResponse({ success: false, message: 'Upstream service unavailable' }, 502);
  }
}

export const dynamic = 'force-dynamic';
export const GET = guardedHandler;
export const POST = guardedHandler;
export const PUT = guardedHandler;
export const PATCH = guardedHandler;
export const DELETE = guardedHandler;
