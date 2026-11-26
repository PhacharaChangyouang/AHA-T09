'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { authApi } from '../../services/api';
import { clearSession } from '../../services/auth';

export default function ResetPinPage() {
  const initialized = useRef(false);
  const requestVersion = useRef(0);
  const [token, setToken] = useState('');
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const consumeLink = () => {
      const value = new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
      if (!value && initialized.current) return;
      initialized.current = true; requestVersion.current++;
      window.history.replaceState(window.history.state, '', '/reset-pin');
      setDone(false); setPin(''); setConfirmation(''); setBusy(false);
      if (/^[a-f0-9]{64}$/.test(value)) { setToken(value); setError(''); }
      else { setToken(''); setError('ลิงก์ตั้ง PIN ไม่ถูกต้อง กรุณาขอลิงก์ใหม่'); }
    };
    consumeLink();
    window.addEventListener('hashchange', consumeLink);
    return () => window.removeEventListener('hashchange', consumeLink);
  }, []);
  const valid = /^\d{4}$/.test(pin) && pin === confirmation;
  const submit = async event => {
    event.preventDefault();
    if (busy || done || !token || !valid) return;
    const version = requestVersion.current;
    setBusy(true); setError('');
    try {
      await authApi.resetPinEmail(token, pin, confirmation);
      if (version !== requestVersion.current) return;
      setDone(true); setToken(''); clearSession();
    } catch (err) { if (version === requestVersion.current) setError(err.message || 'ตั้ง PIN ไม่สำเร็จ กรุณาขอลิงก์ใหม่หรือลองอีกครั้ง'); }
    finally { if (version === requestVersion.current) { setPin(''); setConfirmation(''); setBusy(false); } }
  };
  return <main className="pin-reset-page"><section className="pin-reset-card">
    <div className="pin-reset-brand">AHA Health</div>
    <h1>{done ? 'ตั้ง PIN ใหม่แล้ว' : 'ตั้ง PIN ใหม่สำหรับบัญชีเดิม'}</h1>
    {done ? <div role="status"><p>ข้อมูลและรายการยาเดิมยังอยู่ ระบบออกจากระบบทุกอุปกรณ์แล้ว</p><p>เข้าสู่ระบบด้วยเบอร์เดิมและ PIN ที่เพิ่งตั้งได้เลย</p><Link className="pin-reset-button" href="/?mode=pin">เข้าสู่ระบบด้วย PIN</Link></div> : <>
      <p>ลิงก์นี้ใช้ได้ครั้งเดียวภายใน 15 นาที การเปิดหน้าอีเมลอย่างเดียวยังไม่เปลี่ยน PIN ของคุณ</p>
      {token && <form onSubmit={submit}>
        <label>PIN ใหม่ 4 หลัก<input type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} pattern="[0-9]{4}" value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))} disabled={busy} required /></label>
        <label>ยืนยัน PIN ใหม่<input type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} pattern="[0-9]{4}" value={confirmation} onChange={event => setConfirmation(event.target.value.replace(/\D/g, '').slice(0, 4))} disabled={busy} required /></label>
        <p>เมื่อตั้งสำเร็จ ระบบจะออกจากระบบทุกอุปกรณ์ แล้วให้เข้าสู่ระบบด้วย PIN ที่ตั้งใหม่</p>
        <button className="pin-reset-button" disabled={busy || !valid}>{busy ? 'กำลังบันทึก…' : 'ยืนยันและตั้ง PIN ใหม่'}</button>
      </form>}
      {error && <p className="pin-reset-error" role="alert">{error}</p>}
      <Link className="pin-reset-link" href="/forgot-pin">ลิงก์หมดอายุหรือเข้าไม่ได้? ขอลิงก์ใหม่</Link>
      <p>ตรวจสอบว่าเว็บไซต์คือ ahahealth.online และอย่าส่ง PIN รหัสผ่าน หรือลิงก์นี้ให้ผู้อื่น</p>
    </>}
    <style jsx global>{`
      .pin-reset-page{min-height:100dvh;padding:28px 16px;box-sizing:border-box;background:var(--aha-bg,#f4f6f8);color:var(--aha-text,#111111);display:grid;place-items:center;font-family:var(--font-prompt),Arial,sans-serif}
      .pin-reset-card{width:min(100%,520px);box-sizing:border-box;border:1px solid var(--aha-border,#ddd);border-radius:22px;padding:28px;background:var(--aha-surface,#ffffff);overflow-wrap:anywhere}
      .pin-reset-brand{font-size:23px;font-weight:800}.pin-reset-card h1{font-size:26px;line-height:1.5;margin:16px 0}.pin-reset-card p{font-size:15px;line-height:1.8}
      .pin-reset-card form,.pin-reset-card label{display:grid;gap:12px}.pin-reset-card form{gap:18px}.pin-reset-card input{box-sizing:border-box;min-height:52px;width:100%;padding:12px;border:1px solid var(--aha-border,#bbb);border-radius:12px;background:var(--aha-surface,#fff);color:inherit;font-size:20px;letter-spacing:.3em}
      .pin-reset-card input:focus-visible,.pin-reset-button:focus-visible,.pin-reset-link:focus-visible{outline:3px solid #244fcb;outline-offset:3px}
      .pin-reset-button{min-height:52px;box-sizing:border-box;padding:14px 20px;border:0;border-radius:12px;background:#244fcb;color:#ffffff;font:inherit;text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center;cursor:pointer}.pin-reset-button:disabled{opacity:.6;cursor:default}
      .pin-reset-link{display:inline-flex;align-items:center;min-height:48px;color:inherit;text-decoration:underline}.pin-reset-error{padding:12px;border:2px solid currentColor;border-radius:12px}
    `}</style>
  </section></main>;
}
