const LEGACY_PREFERENCE_KEY = 'aha_push_enabled';

function preferenceKey(userId) {
  return userId ? `aha_push_enabled_${userId}` : LEGACY_PREFERENCE_KEY;
}

function createPushError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function readPreference(key) {
  try { return localStorage.getItem(key); } catch (_) { return null; }
}

function writePreference(key, value) {
  try { localStorage.setItem(key, value); } catch (_) {}
}

function removePreference(key) {
  try { localStorage.removeItem(key); } catch (_) {}
}

export async function registerAhaServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  return navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

export async function getAhaPushSubscription() { return null; }

export function isAhaPushEnabledLocally(userId) {
  if (typeof window === 'undefined') return true;

  const key = preferenceKey(userId);
  const scopedValue = readPreference(key);
  if (scopedValue !== null) return scopedValue !== 'false';

  // The legacy device-wide value is not trustworthy because older releases
  // wrote `false` automatically whenever a subscription check temporarily
  // failed. Reset it to the new default-on, user-scoped preference. From this
  // release onward only an explicit toggle action writes `false`.
  const legacyValue = userId ? readPreference(LEGACY_PREFERENCE_KEY) : null;
  if (legacyValue !== null) {
    writePreference(key, 'true');
    removePreference(LEGACY_PREFERENCE_KEY);
    return true;
  }

  return true;
}

export function setAhaPushPreference(enabled, userId) {
  if (typeof window === 'undefined') return;
  writePreference(preferenceKey(userId), enabled ? 'true' : 'false');
}

export function getAhaPushPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function enableAhaPush() {
  throw createPushError('ฉบับ Academic ไม่ส่ง Web Push จริง', 'PUSH_NOT_CONFIGURED');
}

export async function disableAhaPush({ rememberPreference = true, userId } = {}) {
  if (rememberPreference) setAhaPushPreference(false, userId);
}
