'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

export const SPONSOR_MAP_URL = 'https://maps.app.goo.gl/4HYs2zggU4B5QPV97?g_st=ic';
const FOLLOW_URL = 'https://www.tiktok.com/@ahahealth.online?_r=1&_t=ZS-9AoigpQueEG';
const HIDE_KEY = 'aha_promotions_hide_until';
const SESSION_KEY = 'aha_promotions_seen';
const SESSION_NEXT_KEY = 'aha_promotions_next';
const HIDE_DAYS = 7;
const PROMOTIONS = [
  { title: 'ติดตามเรา • AHA', image: '/sponsors/aha-follow-us.jpeg', width: 1122, height: 1402,
    alt: 'ติดตาม AHA บน TikTok พร้อมผลงานจาก Fastwork', href: FOLLOW_URL, destination: 'TikTok' },
  { title: 'ผู้สนับสนุน • Veerachan Usahanun Studio and Gallery', image: '/sponsors/veerachan-studio-gallery.jpeg', width: 1103, height: 1426,
    alt: 'Veerachan Usahanun Studio and Gallery บรรยากาศร้าน งานศิลปะและเครื่องดื่ม', href: SPONSOR_MAP_URL, destination: 'Google Maps', sponsor: true },
];

export function recordSponsorClick() {
  try {
    let eventId;
    if (typeof window.crypto?.randomUUID === 'function') eventId = window.crypto.randomUUID();
    else if (window.crypto?.getRandomValues) {
      const bytes = window.crypto.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
      const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
      eventId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
    if (!eventId) return;
    void fetch('/api/sponsors/veerachan/click', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-AHA-Request': '1' },
      credentials: 'omit', keepalive: true, body: JSON.stringify({ eventId }),
    }).catch(() => {});
  } catch { /* Navigation does not depend on measurement. */ }
}

export default function SponsorCard() {
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState(0);
  const [hideForSevenDays, setHideForSevenDays] = useState(false);
  const dialog = useRef(null);
  const closeButton = useRef(null);
  const promotion = PROMOTIONS[selected];

  useEffect(() => {
    try {
      const until = Math.max(...[HIDE_KEY, 'aha_flood_emergency_hide_until'].map(key => {
        const value = Number(localStorage.getItem(key) || 0);
        return Number.isFinite(value) ? value : 0;
      }));
      const next = Number(sessionStorage.getItem(SESSION_NEXT_KEY) || 0);
      setSelected(next === 1 ? 1 : 0);
      setVisible(Date.now() >= until && sessionStorage.getItem(SESSION_KEY) !== '1');
    } catch { setVisible(true); }
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    const previousFocus = document.activeElement;
    closeButton.current?.focus();
    return () => { if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus(); };
  }, [visible]);

  useEffect(() => {
    if (visible) {
      if (dialog.current) dialog.current.scrollTop = 0;
      closeButton.current?.focus();
    }
  }, [visible, selected]);

  const close = () => {
    if (hideForSevenDays) {
      try { localStorage.setItem(HIDE_KEY, String(Date.now() + HIDE_DAYS * 86400000)); } catch { /* Storage may be disabled. */ }
    }
    if (selected < PROMOTIONS.length - 1) {
      try { sessionStorage.setItem(SESSION_NEXT_KEY, String(selected + 1)); } catch { /* Continue even without storage. */ }
      setSelected(selected + 1);
    } else {
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* Closing remains available. */ }
      setVisible(false);
    }
  };

  const onKeyDown = event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key !== 'Tab') return;
    const items = Array.from(dialog.current?.querySelectorAll('button, a[href], input') || []);
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };

  if (!visible) return null;

  return (
    <div className="aha-promo-backdrop">
      <section className="aha-promo-popup" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="aha-promo-title" onKeyDown={onKeyDown}>
        <header>
          <h2 id="aha-promo-title" aria-live="polite">{promotion.title}</h2>
          <button ref={closeButton} type="button" className="aha-promo-close" onClick={close} aria-label="ปิดหน้าต่างประชาสัมพันธ์">×</button>
        </header>
        <a key={promotion.href} className="aha-promo-link" href={promotion.href} target="_blank" rel={promotion.sponsor ? 'noopener noreferrer sponsored' : 'noopener noreferrer'} aria-label={`แตะภาพเพื่อเปิด ${promotion.destination} (เปิดในแท็บใหม่)`} onClick={() => { if (promotion.sponsor) recordSponsorClick(); close(); }}>
          <div className="aha-promo-picture">
            <Image src={promotion.image} alt={promotion.alt} width={promotion.width} height={promotion.height} sizes="(max-width: 540px) 94vw, 480px" priority unoptimized />
          </div>
          <strong className="aha-promo-action">แตะภาพเพื่อเปิด</strong>
        </a>
        <label className="aha-promo-choice">
          <input type="checkbox" checked={hideForSevenDays} onChange={event => setHideForSevenDays(event.target.checked)} />
          <span>ไม่แสดงอีก {HIDE_DAYS} วัน</span>
        </label>
      </section>
      <style jsx>{`
        .aha-promo-backdrop{position:fixed;inset:0;z-index:10060;display:grid;place-items:center;padding:12px;background:rgba(0,0,0,.7);backdrop-filter:blur(6px)}
        .aha-promo-popup{box-sizing:border-box;width:min(500px,100%);max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px);overflow:auto;background:#fff;color:#000;border-radius:20px;padding:12px;box-shadow:0 24px 80px rgba(0,0,0,.35)}
        header{display:flex;gap:8px;align-items:center;margin-bottom:8px}h2{flex:1;min-width:0;font-size:17px;line-height:1.4;margin:0;color:#000;overflow-wrap:anywhere}
        .aha-promo-close{flex:0 0 44px;height:44px;border:1px solid #ccc;border-radius:50%;background:#fff;color:#000;font-size:30px;cursor:pointer}
        .aha-promo-link{display:block;color:#000;text-decoration:none;border-radius:10px}
        .aha-promo-picture{background:#f5f5f5;border-radius:10px;overflow:hidden}
        .aha-promo-picture :global(img){display:block;width:100%;height:auto;max-height:min(690px,calc(100vh - 230px));max-height:min(690px,calc(100dvh - 230px));object-fit:contain}
        .aha-promo-action{margin-top:8px;display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;background:#000;color:#fff;border-radius:10px;font-size:16px;text-align:center;padding:4px 8px;box-sizing:border-box}
        .aha-promo-choice{display:flex;justify-content:center;align-items:center;gap:10px;min-height:44px;margin-top:6px;font-size:15px;color:#000;cursor:pointer}.aha-promo-choice input{width:22px;height:22px;accent-color:#000;flex:none}
        button:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid #000;outline-offset:3px}
      `}</style>
    </div>
  );
}
