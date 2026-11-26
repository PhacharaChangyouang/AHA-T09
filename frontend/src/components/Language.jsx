'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { english, translate } from '../services/translations';

let memoryLanguage = 'th';
function snapshot() {
  try { const saved = window.localStorage.getItem('aha_language'); return saved === 'en' ? 'en' : saved === 'th' ? 'th' : memoryLanguage; }
  catch (_) { return memoryLanguage; }
}
function subscribe(listener) {
  window.addEventListener('storage', listener);
  window.addEventListener('aha-language-change', listener);
  return () => { window.removeEventListener('storage', listener); window.removeEventListener('aha-language-change', listener); };
}
export function useLanguage() {
  return useSyncExternalStore(subscribe, snapshot, () => 'th');
}
export function T({ children }) {
  const language = useLanguage();
  return typeof children === 'string' ? translate(children, language) : children;
}
export function LanguageDocument() {
  const language = useLanguage();
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  return null;
}
export function LanguageSelector() {
  const language = useLanguage();
  return <section className="aha-profile-section aha-language-settings">
    <label htmlFor="aha-language"><strong><T>ภาษา</T> / Language</strong></label>
    <select id="aha-language" value={language} onChange={event => {
      const value = event.target.value === 'en' ? 'en' : 'th';
      memoryLanguage = value;
      try { window.localStorage.setItem('aha_language', value); } catch (_) {}
      window.dispatchEvent(new Event('aha-language-change'));
    }}><option value="th">ไทย</option><option value="en">English</option></select>
    <p><T>เปลี่ยนภาษาของเมนู ชื่อยาและข้อความที่ผู้ใช้บันทึกจะคงเดิม</T></p>
  </section>;
}

// Exported catalog lets checks verify coverage without changing user-entered data.
export const languageCatalog = english;
