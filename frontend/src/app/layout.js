import './globals.css';
import Script from 'next/script';
import { headers } from 'next/headers';
import { prompt } from './font';
import AhaNavigation from '../components/AhaNavigation';
import MedicationNotificationManager from '../components/MedicationNotificationManager';
import AhaVisualPolish from '../components/AhaVisualPolish';
import AhaResponsiveFix from '../components/AhaResponsiveFix';
import AhaCaregiverEnhancements from '../components/AhaCaregiverEnhancements';
import FamilyHomeShortcut from '../components/FamilyHomeShortcut';
import CookieConsent from '../components/CookieConsent';
import AhaLayoutRefresh from '../components/AhaLayoutRefresh';
import { LanguageDocument } from '../components/Language';
import AhaPwaRegistration from '../components/AhaPwaRegistration';

export const metadata = {
  title: 'AHA-T09 — Academic Edition',
  robots: { index: false, follow: false },
  description: 'ผู้ช่วยสุขภาพอัจฉริยะสำหรับผู้สูงอายุและผู้ดูแล',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'AHA', statusBarStyle: 'default' },
  icons: {
    icon: [{ url: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' }, { url: '/icons/icon-512.png', type: 'image/png', sizes: '512x512' }],
    shortcut: '/favicon.ico',
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport = {
  themeColor: '#0EA9E9',
  initialScale: 1,
  width: 'device-width',
  viewportFit: 'cover',
};

export default async function RootLayout({ children }) {
  const nonce = (await headers()).get('x-nonce') || undefined;
  return (
    <html lang="th" className={prompt.variable}>
      <body className={prompt.className}>
        <Script id="aha-pwa-install-init" src="/pwa-install-init.js" nonce={nonce} strategy="beforeInteractive" />
        <Script id="aha-appearance-init" nonce={nonce} strategy="beforeInteractive">{`
          try {
            var mode = localStorage.getItem('aha_appearance') || 'light';
            var dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
            document.documentElement.dataset.ahaAppearance = dark ? 'dark' : 'light';
            document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
          } catch (_) {}
        `}</Script>
        {children}
        <AhaPwaRegistration />
        <LanguageDocument />
        <AhaNavigation />
        <AhaVisualPolish />
        <AhaResponsiveFix />
        <AhaCaregiverEnhancements />
        <FamilyHomeShortcut />
        <MedicationNotificationManager />
        <CookieConsent />
        <AhaLayoutRefresh />
      </body>
    </html>
  );
}

