'use client';

import { T } from './Language';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import AhaIcon from './AhaIcon';
import AhaBrandMark from './AhaBrandMark';
import { familyApi } from '../services/api';

function Brand() {
  return (
    <div className="aha-v3-brand">
      <span className="aha-v3-brand-mark">
        <AhaBrandMark />
      </span>
      <span><strong>AHA</strong><small>AI Health Assistant</small></span>
    </div>
  );
}

export default function AhaNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [familyConnected, setFamilyConnected] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;
    // Browser chrome and pinch zoom can also shrink VisualViewport. Only an
    // editing field plus a keyboard-sized gap should lift the bottom dock.
    const update = () => {
      const editing = document.activeElement?.matches?.('input,textarea,[contenteditable="true"]');
      const gap = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      document.documentElement.style.setProperty('--aha-viewport-bottom-gap', `${editing && gap > 120 ? gap : 0}px`);
    };
    let focusTimer;
    const focusChanged = () => {
      window.clearTimeout(focusTimer);
      focusTimer = window.setTimeout(update, 0);
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    document.addEventListener('focusin', focusChanged);
    document.addEventListener('focusout', focusChanged);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      document.removeEventListener('focusin', focusChanged);
      document.removeEventListener('focusout', focusChanged);
      window.clearTimeout(focusTimer);
      document.documentElement.style.removeProperty('--aha-viewport-bottom-gap');
    };
  }, []);

  const publicRoutes = ['/about', '/login', '/install', '/forgot-password', '/forgot-pin', '/reset-password', '/reset-pin', '/privacy-policy', '/terms', '/terms-of-service', '/cookies-policy'];
  const isPublicRoute = !pathname || pathname === '/' || publicRoutes.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  useEffect(() => {
    let mounted = true;
    if (isPublicRoute) return undefined;
    familyApi.connections()
      .then((result) => {
        const rows = Array.isArray(result?.data) ? result.data : [];
        if (mounted) setFamilyConnected(rows.some((item) => item.status === 'accepted'));
      })
      .catch(() => { if (mounted) setFamilyConnected('error'); });
    return () => { mounted = false; };
  }, [isPublicRoute]);

  useEffect(() => {
    const updateUnreadCount = (event) => {
      const nextCount = Number(event?.detail?.count);
      const delta = Number(event?.detail?.delta);
      if (Number.isFinite(nextCount)) setUnreadCount(Math.max(0, nextCount));
      else if (Number.isFinite(delta)) setUnreadCount((current) => Math.max(0, current + delta));
    };
    window.addEventListener('aha-notifications-count', updateUnreadCount);
    return () => window.removeEventListener('aha-notifications-count', updateUnreadCount);
  }, []);

  if (isPublicRoute) return null;

  // Keep the primary navigation at exactly five destinations.
  // Profile is intentionally handled from the top-right account control.
  const items = [
    ['home', 'หน้าหลัก', '/home'],
    ['pill', 'ยา', '/reminders'],
    ['mic', 'พูดกับ AHA', '/voice'],
    ['bell', 'การแจ้งเตือน', '/notifications'],
    ['warning', 'ฉุกเฉิน', '/emergency'],
  ];

  return (
    <aside className="aha-v3-sidebar" data-aha-navigation="true">
      <Brand />
      <nav className="aha-v3-side-links" aria-label="เมนูหลัก AHA">
        {items.map(([icon, label, path]) => {
          const active = pathname === path || pathname.startsWith(`${path}/`);
          return (
            <button
              key={path}
              type="button"
              className={`${active ? 'active' : ''}${path === '/voice' ? ' aha-v3-nav-voice' : ''}${path === '/emergency' ? ' danger' : ''}`}
              onClick={() => router.push(path)}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
            >
              <AhaIcon name={icon} size={path === '/voice' ? 26 : 24} />
              <span><T>{label}</T></span>
              {path === '/notifications' && unreadCount > 0 && (
                <b className="aha-nav-badge" aria-label={`ยังไม่ได้อ่าน ${unreadCount} รายการ`}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </b>
              )}
            </button>
          );
        })}
      </nav>

      <div className="aha-v3-side-spacer" />
      <div className={`aha-v3-side-care ${familyConnected === false ? 'disconnected' : ''}`}><AhaIcon name="users" size={25} /><div><strong><T>ครอบครัว</T></strong><span><i /> <T>{familyConnected === null ? 'กำลังตรวจสอบ…' : familyConnected === 'error' ? 'ตรวจสอบสถานะไม่ได้' : familyConnected ? 'เชื่อมต่อแล้ว' : 'ยังไม่ได้เชื่อมต่อ'}</T></span></div></div>
      <div className="aha-v3-side-wellness"><AhaIcon name="heart" size={31} /><strong><T>สุขภาพดี</T><br /><T>เริ่มได้ทุกวัน</T></strong><span className="aha-v3-wave">〰</span></div>
    </aside>
  );
}
