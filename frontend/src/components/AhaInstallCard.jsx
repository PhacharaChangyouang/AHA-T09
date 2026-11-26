'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { getInstallSnapshot, requestAhaInstall, subscribeInstallState } from '../services/pwa-install';
import styles from './AhaInstallCard.module.css';

const serverSnapshot = () => 'checking:other';

export default function AhaInstallCard({ persistent = false, hideWhenInstalled = false }) {
  const snapshot = useSyncExternalStore(subscribeInstallState, getInstallSnapshot, serverSnapshot);
  const [phase, platform] = snapshot.split(':');
  if (phase === 'checking' || (phase === 'standalone' && (!persistent || hideWhenInstalled)) || (phase === 'installed' && hideWhenInstalled)) return null;
  const ready = phase === 'available';
  const busy = phase === 'installing';
  const canRequest = !['standalone', 'installed', 'accepted'].includes(phase);
  const messages = {
    standalone: 'กำลังเปิด AHA แบบแอปแล้ว ไม่มีแถบที่อยู่เว็บไซต์',
    installed: 'ระบบแจ้งว่าติดตั้ง AHA แล้ว ให้เปิดจากไอคอน AHA บนหน้าแอปหรือหน้าจอโฮม',
    accepted: 'ส่งคำขอติดตั้งแล้ว รอให้ระบบติดตั้งเสร็จ แล้วเปิดจากไอคอน AHA',
    installing: 'กำลังรอการยืนยันจากหน้าต่างติดตั้งของอุปกรณ์…',
    failed: 'ยังติดตั้งไม่สำเร็จ ลองดูวิธีติดตั้งด้านล่าง แล้วเปิดเว็บไซต์ด้วยเบราว์เซอร์ที่รองรับ',
    unavailable: platform === 'ios'
      ? 'อุปกรณ์นี้ต้องเพิ่มแอปผ่านเมนูของเบราว์เซอร์: เปิดใน Safari → แชร์ → เพิ่มไปยังหน้าจอโฮม'
      : platform === 'embedded'
        ? 'เบราว์เซอร์ในแอปนี้ยังเปิดหน้าต่างติดตั้งไม่ได้ กรุณาเปิด AHA ใน Chrome แล้วกดติดตั้งอีกครั้ง'
        : 'เบราว์เซอร์ยังไม่เสนอหน้าต่างติดตั้งให้ AHA หากติดตั้งแล้วให้เปิดจากไอคอน AHA หากยังไม่ได้ติดตั้ง ให้เปิดเมนูของเบราว์เซอร์แล้วเลือก “ติดตั้งแอป” หรือ “เพิ่มลงในหน้าจอหลัก” หากมีตัวเลือกนี้',
  };
  const message = messages[phase] || (platform === 'embedded'
    ? 'เปิดเว็บไซต์นี้ด้วย Chrome ก่อนติดตั้ง ไม่ควรเพิ่มทางลัดจากเบราว์เซอร์ในแอปแชท'
    : 'ตอนนี้เปิดผ่านเบราว์เซอร์ หากติดตั้งแล้ว ให้เปิดจากไอคอน AHA แทนทางลัดเว็บไซต์');
  return <section className={styles.card} aria-label="ติดตั้งและเปิดแอป AHA">
    <div><h2>{phase === 'standalone' ? 'AHA พร้อมใช้งานแบบแอป' : 'เปิด AHA แบบแอป ใช้ง่ายกว่าเดิม'}</h2>
      <p role="status">{message}</p>
      {ready && <p>ติดตั้งแล้วเปิดจากไอคอน AHA เพื่อใช้งานโดยไม่มีแถบที่อยู่เว็บไซต์ด้านบน</p>}
    </div>
    {phase !== 'standalone' && <div className={styles.actions}>
      {canRequest && <button type="button" onClick={requestAhaInstall} disabled={busy} aria-busy={busy}>{busy ? 'กำลังติดตั้ง…' : 'ติดตั้ง AHA'}</button>}
      <Link href="/install">{platform === 'ios' ? 'วิธีเพิ่ม AHA บน iPhone/iPad' : 'วิธีติดตั้ง / แก้ปัญหาแถบด้านบน'}</Link>
    </div>}
  </section>;
}
