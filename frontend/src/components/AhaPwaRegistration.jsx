'use client';
import { useEffect } from 'react';

export default function AhaPwaRegistration() {
  useEffect(() => {
    if (!window.isSecureContext || !('serviceWorker' in navigator)) return undefined;
    // Register the existing push worker independently of notification permission.
    // Registration neither asks for permission nor creates a push subscription.
    const register = () => { navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {}); };
    if (document.readyState === 'complete') { register(); return undefined; }
    window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);
  return null;
}
