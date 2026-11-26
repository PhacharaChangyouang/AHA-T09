'use client';

import { T } from '../../components/Language';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AhaIcon from '../../components/AhaIcon';
import { saveSession } from '../../services/auth';
import { authApi, emergencyApi } from '../../services/api';

export default function EmergencyPage() {
  const router = useRouter();
  const timer = useRef(null);
  const [holding, setHolding] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    authApi.me().then((result) => { if (active && result?.user) saveSession({ user: result.user }); }).catch(() => { if (active) router.replace('/login'); });
    return () => { active = false; if (timer.current) clearTimeout(timer.current); };
  }, [router]);

  const confirmEmergency = async () => {
    setSending(true);
    setMessage('');
    try {
      const result = await emergencyApi.notify({
        message: '[Academic simulation] คำขอ SOS จำลอง',
      });
      if (result?.success !== true || Number(result?.notified || 0) < 1) {
        throw new Error(result?.message || 'ไม่สามารถบันทึกคำขอ SOS ได้ กรุณาโทร 1669');
      }
      // Persisted in Notification DB does not prove that a device received Push.
      setSent(true);
      setMessage('บันทึกคำขอ SOS จำลองแล้ว ไม่ได้ส่งการแจ้งเตือนจริง หากเกิดเหตุจริงให้โทร 1669 ด้วยแอปโทรศัพท์ทันที');
    } catch (error) {
      setMessage(error.message || 'ส่งการแจ้งเหตุไม่สำเร็จ');
    } finally {
      setSending(false);
    }
  };

  const start = () => {
    if (sending) return;
    if (timer.current) clearTimeout(timer.current);
    setHolding(true);
    setSent(false);
    setMessage('กดค้างต่ออีกเล็กน้อยเพื่อยืนยัน');
    timer.current = setTimeout(() => {
      timer.current = null;
      setHolding(false);
      confirmEmergency();
    }, 2000);
  };

  const stop = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      setMessage((current) => current === 'กดค้างต่ออีกเล็กน้อยเพื่อยืนยัน' ? '' : current);
    }
    timer.current = null;
    setHolding(false);
  };

  return (
    <div className="aha-page aha-layout-refresh aha-emergency-screen">
      <div className="aha-shell">
        <header className="topbar">
          <div className="brand">
            <button className="icon-btn" onClick={() => router.push('/home')} aria-label="กลับหน้าหลัก">
              <AhaIcon name="arrow" size={21} />
            </button>
            <div className="brand-mark aha-danger-mark"><AhaIcon name="warning" /></div>
            <span><T>ฉุกเฉิน</T></span>
          </div>
          <button className="btn btn-soft" onClick={() => router.push('/home')}><T>กลับหน้าหลัก</T></button>
        </header>

        <main className="aha-emergency-page">
          <section className="aha-emergency-hero">
            <div className="eyebrow">EMERGENCY CENTER — ACADEMIC SIMULATION</div>
            <h1><T>ต้องการความช่วยเหลือ?</T></h1>
            <p><T>กดปุ่มค้าง 2 วินาทีเพื่อบันทึก SOS จำลองในระบบการศึกษา ไม่ใช้ตำแหน่งจริงและไม่แจ้งเหตุภายนอก</T></p>

            <div className={`aha-sos-wrap ${holding ? 'holding' : ''}`}>
              <button
                className="aha-sos-button"
                onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture?.(event.pointerId); start(); }}
                onPointerUp={(event) => { event.preventDefault(); stop(); }}
                onPointerLeave={stop}
                onPointerCancel={stop}
                onKeyDown={(event) => {
                  if (event.key === ' ' || event.key === 'Enter') {
                    event.preventDefault();
                    if (!event.repeat) start();
                  }
                }}
                onKeyUp={(event) => {
                  if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); stop(); }
                }}
                onBlur={stop}
                onContextMenu={(event) => event.preventDefault()}
                onDragStart={(event) => event.preventDefault()}
                aria-label="กดค้างเพื่อขอความช่วยเหลือ"
                style={{ touchAction:'none', userSelect:'none', WebkitUserSelect:'none', WebkitTouchCallout:'none' }}
              >
                <AhaIcon name="warning" size={42} />
                <strong><T>{sending ? 'กำลังส่ง' : holding ? 'ยืนยัน...' : 'SOS'}</T></strong>
                <span><T>{sent ? 'บันทึกเหตุจำลองแล้ว' : 'กดค้าง 2 วินาที'}</T></span>
              </button>
            </div>

            {message && (
              <div className={sent ? 'success aha-emergency-message' : 'error aha-emergency-message'}>
                <AhaIcon name={sent ? 'check' : 'warning'} size={20} />
                <span>{message}</span>
              </div>
            )}

            <div className="aha-emergency-call">
              <label><T>สายฉุกเฉิน</T></label>
              <div>
                <input value="1669" readOnly inputMode="numeric" aria-label="เบอร์ฉุกเฉิน" />
                <button type="button" className="btn btn-danger btn-lg" disabled>
                  <AhaIcon name="phone" /><T>ไม่เปิดโทรศัพท์ในระบบทดลอง</T></button>
              </div>
              <small><T>ระบบนี้ใช้เพื่อการศึกษาเท่านั้น หากเกิดเหตุฉุกเฉินจริง ให้โทร 1669 ด้วยแอปโทรศัพท์ทันที</T></small>
            </div>
          </section>
        </main>

        <nav className="footer-nav">
          <div className="footer-nav-inner">
            <button className="footer-link" onClick={() => router.push('/home')}><AhaIcon name="home" size={20} /><span><T>หน้าหลัก</T></span></button>
            <button className="footer-link" onClick={() => router.push('/reminders')}><AhaIcon name="pill" size={20} /><span><T>ยา</T></span></button>
            <button className="footer-link" onClick={() => router.push('/voice')}><AhaIcon name="mic" size={20} /><span><T>พูดกับ AHA</T></span></button>
            <button className="footer-link active danger"><AhaIcon name="warning" size={20} /><span><T>ฉุกเฉิน</T></span></button>
          </div>
        </nav>
      </div>
    </div>
  );
}

