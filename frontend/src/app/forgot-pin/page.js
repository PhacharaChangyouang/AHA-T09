'use client';

import { T } from '../../components/Language';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GoogleSignInButton from '../../components/GoogleSignInButton';
import { authApi } from '../../services/api';
import { clearSession } from '../../services/auth';

export default function ForgotPinPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [method, setMethod] = useState('password');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [finished, setFinished] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailCooldown, setEmailCooldown] = useState(0);

  useEffect(() => {
    if (emailCooldown <= 0) return undefined;
    const timer = setTimeout(() => setEmailCooldown(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [emailCooldown]);

  const sendEmailLink = async event => {
    event.preventDefault();
    if (emailBusy || emailCooldown > 0) return;
    setEmailError(''); setEmailSent(false); setEmailBusy(true);
    try {
      const result = await authApi.requestPinResetEmail(recoveryEmail.trim());
      setEmailSent(true); setEmailCooldown(result.cooldownSeconds || 120);
    } catch (err) {
      setEmailError(err.message || 'ขอลิงก์ไม่สำเร็จ กรุณาลองใหม่');
      if (err.status === 429) setEmailCooldown(err.data?.retryAfterSeconds || 120);
    } finally { setEmailBusy(false); }
  };

  useEffect(() => {
    let mounted = true;
    authApi.me().then(result => {
      if (!mounted) return;
      setUser(result?.user || null);
      if (result?.user?.authProvider === 'google') setMethod('google');
    }).catch(() => {}).finally(() => { if (mounted) setChecking(false); });
    return () => { mounted = false; };
  }, []);

  const validPin = /^\d{4}$/.test(pin) && pin === confirmation;
  const recover = async (credential) => {
    if (busy || finished) return;
    setError('');
    if (!validPin) { setError('กรอก PIN ใหม่ 4 หลักให้ตรงกันทั้งสองช่อง'); return; }
    if (method === 'password' && !password) { setError('กรุณากรอกรหัสผ่าน AHA ปัจจุบัน'); return; }
    if (method === 'google' && !credential) { setError('กรุณายืนยันด้วย Google ที่เชื่อมไว้'); return; }
    setBusy(true);
    try {
      await authApi.recoverPin({ method, ...(method === 'google' ? { credential } : { currentCredential: password }), newPin: pin, confirmNewPin: confirmation });
      setPin(''); setConfirmation(''); setPassword(''); clearSession(); setFinished(true);
    } catch (err) {
      setError(err.message || 'ตั้ง PIN ใหม่ไม่สำเร็จ กรุณาลองอีกครั้ง');
    } finally { setBusy(false); }
  };

  return <main className="aha-pin-recovery">
    <div className="aha-pin-recovery-shell">
      <Link className="aha-recovery-link" href={user && !finished ? '/profile' : '/login'}><T>← กลับ</T></Link>
      <header><span>AHA</span><h1><T>ลืม PIN?</T></h1><p><T>ตั้ง PIN ใหม่โดยยืนยันว่าเป็นเจ้าของบัญชีเดิม</T></p></header>
      {!finished && <section aria-labelledby="email-pin-title" style={{ marginTop: 20 }}>
        <h2 id="email-pin-title">ตั้ง PIN ใหม่ผ่านอีเมล</h2>
        <p>กรอกอีเมลที่ผูกกับบัญชีเดิม คุณไม่ต้องใช้ PIN เดิมและไม่ต้องสมัครบัญชีใหม่</p>
        <form onSubmit={sendEmailLink}>
          <label>อีเมลที่ผูกกับบัญชี<input type="email" autoComplete="email" maxLength={254} value={recoveryEmail} onChange={event => setRecoveryEmail(event.target.value)} disabled={emailBusy} required /></label>
          <button className="aha-recovery-primary" disabled={emailBusy || emailCooldown > 0}>{emailBusy ? 'กำลังส่งคำขอ…' : emailCooldown > 0 ? `ขอใหม่ได้ใน ${emailCooldown} วินาที` : 'ส่งลิงก์ตั้ง PIN ใหม่'}</button>
        </form>
        {emailSent && <p role="status">ถ้าอีเมลนี้ผูกกับบัญชี AHA ที่มี PIN ระบบจะส่งลิงก์ให้ กรุณาตรวจกล่องจดหมายและอีเมลขยะ ลิงก์ใช้ได้ครั้งเดียวภายใน 15 นาที</p>}
        {emailError && <p role="alert">{emailError}</p>}
        <p>หากไม่มีอีเมลผูกกับบัญชี หรือใช้อีเมลนั้นไม่ได้ ให้ติดต่อผ่านช่องทางช่วยเหลือของ AHA เพื่อตรวจสอบเจ้าของบัญชี อย่าส่ง PIN รหัสผ่าน หรือ OTP ให้ผู้อื่น</p>
      </section>}
      {checking ? <p role="status"><T>กำลังตรวจสอบบัญชี…</T></p> : finished ? <section role="status"><h2><T>ตั้ง PIN ใหม่แล้ว</T></h2><p><T>ระบบออกจากระบบทุกอุปกรณ์แล้ว กรุณาเข้าสู่ระบบด้วย PIN ใหม่</T></p><button className="aha-recovery-primary" onClick={() => router.replace('/?mode=pin')}><T>กลับเข้าสู่ระบบ</T></button></section> : !user ? <section>
        <h2><T>หรือยืนยันผ่านรหัสผ่าน / Google</T></h2><p><T>หากใช้อีเมลไม่ได้ ให้ใช้รหัสผ่าน AHA หรือ Google ที่เคยเชื่อมไว้ เมื่อเข้าสู่ระบบแล้วจะกลับมาหน้านี้เพื่อตั้ง PIN ใหม่</T></p>
        <Link className="aha-recovery-primary" href="/?returnTo=forgot-pin"><T>เข้าสู่ระบบด้วยรหัสผ่านหรือ Google</T></Link>
        <Link className="aha-recovery-link" href="/forgot-password"><T>ลืมรหัสผ่าน AHA ด้วย?</T></Link>
        <h2><T>เข้าไม่ได้ทั้งสองวิธี?</T></h2><p><T>ติดต่อผู้ดูแลระบบผ่านช่องทางช่วยเหลือที่เคยใช้งาน เพื่อรับขั้นตอนตรวจสอบเจ้าของบัญชี อย่าส่ง PIN รหัสผ่าน หรือ OTP ให้ผู้อื่น</T></p>
      </section> : <section>
        <h2><T>1. ยืนยันบัญชีของคุณ</T></h2><p><T>ใช้รหัสผ่านปัจจุบัน หรือ Google ที่เชื่อมกับบัญชีนี้อยู่แล้ว</T></p>
        <fieldset disabled={busy}><legend><T>วิธียืนยันบัญชี</T></legend><label><input type="radio" name="recovery-method" checked={method === 'password'} onChange={() => { setMethod('password'); setPassword(''); setError(''); }} /><T>รหัสผ่าน AHA</T></label>{user.authProvider === 'google' && <label><input type="radio" name="recovery-method" checked={method === 'google'} onChange={() => { setMethod('google'); setPassword(''); setError(''); }} /><T>Google ที่เชื่อมไว้</T></label>}</fieldset>
        <form onSubmit={event => { event.preventDefault(); if (method === 'password') recover(); }}>
          {method === 'password' && <label><T>รหัสผ่าน AHA ปัจจุบัน</T><input type="password" autoComplete="current-password" value={password} disabled={busy} onChange={event => setPassword(event.target.value)} required /></label>}
          <h2><T>2. ตั้ง PIN ใหม่</T></h2>
          <label><T>PIN ใหม่ 4 หลัก</T><input type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} pattern="[0-9]{4}" value={pin} disabled={busy} onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))} required /></label>
          <label><T>ยืนยัน PIN ใหม่</T><input type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} pattern="[0-9]{4}" value={confirmation} disabled={busy} onChange={event => setConfirmation(event.target.value.replace(/\D/g, '').slice(0, 4))} required /></label>
          {method === 'password' ? <button className="aha-recovery-primary" disabled={busy || !validPin || !password}><T>{busy ? 'กำลังบันทึก…' : 'ยืนยันและตั้ง PIN ใหม่'}</T></button> : <GoogleSignInButton onCredential={recover} disabled={busy || !validPin} />}
        </form>
        <p><T>เมื่อตั้ง PIN สำเร็จ ระบบจะออกจากระบบทุกอุปกรณ์</T></p>
        <p><T>ระบบใช้บัญชีที่เชื่อมไว้เท่านั้น ไม่สามารถเปลี่ยนอีเมลรับรหัสจากหน้านี้ได้</T></p>
        <Link className="aha-recovery-link" href="/profile"><T>ต้องการความช่วยเหลือ? ไปที่โปรไฟล์</T></Link>
      </section>}
      {error && <p className="aha-recovery-error" role="alert">{error}</p>}

    </div>
    <style jsx global>{`
      .aha-pin-recovery{min-height:100dvh;background:var(--aha-bg,#f6f7f9);color:var(--aha-text,#18212b);padding:24px 16px 48px;box-sizing:border-box}
      .aha-pin-recovery-shell{width:min(100%,520px);margin:auto}
      .aha-pin-recovery header{margin:24px 0}.aha-pin-recovery header>span{color:#2f6bff;font-weight:700;font-size:22px}
      .aha-pin-recovery h1{font-size:30px;margin:8px 0}.aha-pin-recovery h2{font-size:19px;margin:22px 0 10px}
      .aha-pin-recovery p{line-height:1.8;font-size:15px}.aha-pin-recovery section{padding:20px;border:1px solid var(--aha-border,#ddd);border-radius:22px;background:var(--aha-surface,#fff)}
      .aha-pin-recovery form{display:grid;gap:16px}.aha-pin-recovery form>label{display:grid;gap:8px}
      .aha-pin-recovery form input{width:100%;box-sizing:border-box;min-height:50px;border:1px solid var(--aha-border,#ddd);border-radius:12px;padding:12px;font-size:16px;background:var(--aha-surface-soft,#f5f6f8);color:inherit}
      .aha-pin-recovery fieldset{border:1px solid var(--aha-border,#ddd);border-radius:12px;padding:12px;margin-bottom:16px;display:grid;gap:8px}
      .aha-pin-recovery fieldset label{display:flex;gap:8px;align-items:center;min-height:44px}
      .aha-recovery-link{display:inline-flex;align-items:center;min-height:44px;color:#2f6bff;text-decoration:underline;text-underline-offset:4px}
      .aha-recovery-primary{display:flex;align-items:center;justify-content:center;min-height:50px;padding:12px 16px;border:0;border-radius:14px;background:#2f6bff;color:white;text-decoration:none;text-align:center;cursor:pointer;font:inherit;box-sizing:border-box}.aha-recovery-primary:disabled{opacity:.6;cursor:default}
      .aha-recovery-error{color:var(--aha-danger,#b72e3c)}
    `}</style>
  </main>;
}
