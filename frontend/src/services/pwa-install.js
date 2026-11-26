export function isAhaStandalone(browser = typeof window === 'undefined' ? null : window) {
  return Boolean(browser && (browser.matchMedia?.('(display-mode: standalone)')?.matches || browser.navigator?.standalone === true));
}

export function getInstallPlatform(browser = typeof window === 'undefined' ? null : window) {
  const ua = browser?.navigator?.userAgent || '';
  if (/FBAN|FBAV|Instagram|Line\/|; wv\)/i.test(ua)) return 'embedded';
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && browser?.navigator?.maxTouchPoints > 1)) return 'ios';
  return /Android/i.test(ua) ? 'android' : 'other';
}

// A primitive snapshot stays stable across React renders. Browser mode alone
// does not prove that the app is absent from the device.
export function getInstallSnapshot() {
  if (typeof window === 'undefined') return 'checking:other';
  const phase = isAhaStandalone() ? 'standalone' : (window.__ahaPwaInstall?.phase || 'idle');
  return phase + ':' + getInstallPlatform();
}

export function subscribeInstallState(listener) {
  const media = window.matchMedia?.('(display-mode: standalone)');
  window.addEventListener('aha-install-change', listener);
  window.addEventListener('pageshow', listener);
  if (media?.addEventListener) media.addEventListener('change', listener);
  else media?.addListener?.(listener);
  return () => {
    window.removeEventListener('aha-install-change', listener);
    window.removeEventListener('pageshow', listener);
    if (media?.removeEventListener) media.removeEventListener('change', listener);
    else media?.removeListener?.(listener);
  };
}

export async function requestAhaInstall() {
  const state = window.__ahaPwaInstall;
  const event = state?.prompt;
  if (!event || state.phase !== 'available') {
    // Keep the action discoverable before the browser offers its native dialog.
    // Explain the limitation in place; never pretend a manual guide installed it.
    if (state && ['idle', 'failed', 'unavailable'].includes(state.phase)) {
      state.phase = 'unavailable';
      window.dispatchEvent(new Event('aha-install-change'));
    }
    return;
  }
  // Consume before awaiting: two buttons cannot reuse one native prompt.
  state.prompt = null;
  state.phase = 'installing';
  const changed = () => window.dispatchEvent(new Event('aha-install-change'));
  changed();
  try {
    // Must run directly inside the user's click, before any asynchronous work.
    await event.prompt();
    const choice = await event.userChoice;
    if (state.phase !== 'installed') state.phase = choice?.outcome === 'accepted' ? 'accepted' : 'idle';
  } catch (_) {
    if (state.phase !== 'installed') state.phase = 'failed';
  }
  changed();
}
