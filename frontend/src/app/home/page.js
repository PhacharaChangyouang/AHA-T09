'use client';
import AhaInstallCard from '../../components/AhaInstallCard';

import { T } from '../../components/Language';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AhaIcon from '../../components/AhaIcon';
import SponsorCard from '../../components/SponsorCard';
import { publishReminderChange } from '../../services/reminder-changes';
import { medicationTaken, medicationDue, personMedicationStatus } from '../../services/medication-status';
import { getAvatar, saveSession } from '../../services/auth';
import { authApi, caregiverApi, familyApi, reminderApi, notificationApi } from '../../services/api';

function listOf(response, key) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.[key])) return response[key];
  return [];
}

function timeOf(value) { return String(value || '').slice(0, 5) || '--:--'; }

function Brand() {
  return <div className="aha-v3-brand"><span className="aha-v3-brand-mark" aria-hidden="true"><span className="aha-v3-brand-wave">⌁</span></span><span><strong>AHA</strong><small>AI Health Assistant</small></span></div>;
}

function StatusPill({ done, current }) {
  return <span className={`aha-v3-status ${done ? 'done' : current ? 'wait' : 'later'}`}><T>{done ? 'กินแล้ว' : current ? 'รอถึงเวลา' : 'รออยู่'}</T></span>;
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [caregiverSummary, setCaregiverSummary] = useState({ elderly: [], today: [], history: [] });
  const [familyConnections, setFamilyConnections] = useState(null);
  const [avatar, setAvatar] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const reminderVersion = useRef(0);

  useEffect(() => {
    let currentUser = null;
    let mounted = true;
    const syncAvatar = () => { if (currentUser?.id) setAvatar(getAvatar(currentUser.id) || currentUser.avatarUrl || ''); };
    window.addEventListener('focus', syncAvatar);
    window.addEventListener('storage', syncAvatar);
    window.addEventListener('aha-avatar-change', syncAvatar);
    authApi.me().then(async (result) => {
      currentUser = result?.user || null;
      if (!mounted || !currentUser) return;
      saveSession({ user: currentUser });
      setUser(currentUser);
      syncAvatar();
      const dataVersion = ++reminderVersion.current;
      const dataPromise = currentUser.role === 'caregiver' ? caregiverApi.summary() : reminderApi.today();
      const settle = (promise) => promise.then(
        (value) => ({ status: 'fulfilled', value }),
        (reason) => ({ status: 'rejected', reason })
      );
      const [dataResult, notificationResult, familyResult] = await Promise.all([settle(dataPromise), settle(notificationApi.unread()), settle(familyApi.connections())]);
      if (!mounted) return;
      if (dataResult.status === 'fulfilled' && dataVersion === reminderVersion.current) {
        if (currentUser.role === 'caregiver') setCaregiverSummary(dataResult.value?.data || { elderly: [], today: [], history: [] });
        else setReminders(listOf(dataResult.value, 'reminders'));
      }
      if (notificationResult.status === 'fulfilled') {
        const unreadNotifications = listOf(notificationResult.value, 'notifications');
        setNotifications(unreadNotifications);
        window.dispatchEvent(new CustomEvent('aha-notifications-count', { detail: { count: unreadNotifications.length } }));
      }
      if (familyResult.status === 'fulfilled') setFamilyConnections(listOf(familyResult.value, 'connections'));
      else setFamilyConnections(undefined);
      if (dataResult.status === 'rejected') setError('ยังเชื่อมต่อข้อมูลล่าสุดไม่ได้ กรุณาลองเปิดหน้านี้ใหม่อีกครั้ง');
    }).catch(() => { if (mounted) router.replace('/login'); }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; window.removeEventListener('focus', syncAvatar); window.removeEventListener('storage', syncAvatar); window.removeEventListener('aha-avatar-change', syncAvatar); };
  }, [router]);

  useEffect(() => {
    if (!user) return undefined;
    const refreshReminders = async () => {
      const version = ++reminderVersion.current;
      try {
        if (user.role === 'caregiver') {
          const result = await caregiverApi.summary();
          if (version !== reminderVersion.current) return;
          setCaregiverSummary(result?.data || { elderly: [], today: [], history: [] });
        } else {
          const result = await reminderApi.today();
          if (version !== reminderVersion.current) return;
          setReminders(listOf(result, 'reminders'));
        }
        setError('');
      } catch (_) {
        if (version === reminderVersion.current) setError('ยังโหลดสถานะล่าสุดไม่ได้ ข้อมูลที่แสดงอาจยังไม่อัปเดต');
      }
    };
    let visiblePending = false;
    const refreshVisible = async () => {
      if (document.visibilityState === 'hidden' || visiblePending) return;
      visiblePending = true;
      try { await refreshReminders(); } finally { visiblePending = false; }
    };
    const interval = window.setInterval(refreshVisible, 60000);
    window.addEventListener('focus', refreshVisible);
    document.addEventListener('visibilitychange', refreshVisible);
    window.addEventListener('aha-reminders-refresh', refreshReminders);
    return () => {
      reminderVersion.current += 1;
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshVisible);
      document.removeEventListener('visibilitychange', refreshVisible);
      window.removeEventListener('aha-reminders-refresh', refreshReminders);
    };
  }, [user]);

  const isCaregiver = user?.role === 'caregiver';
  const activeReminders = useMemo(() => reminders.filter((item) => item.is_active !== false).sort((a, b) => String(a.reminder_time || '').localeCompare(String(b.reminder_time || ''))), [reminders]);
  const nextReminder = activeReminders[0];
  const completed = activeReminders.filter((item) => item.completed || item.taken || item.is_taken).length;
  const total = activeReminders.length;
  const caregiverPeople = caregiverSummary.elderly || [];
  const caregiverToday = caregiverSummary.today || [];
  const caregiverTaken = caregiverToday.filter(medicationTaken).length;
  const caregiverWaiting = caregiverToday.filter((item) => !medicationTaken(item) && medicationDue(item)).length;
  const acceptedConnections = (familyConnections || []).filter((item) => item.status === 'accepted');
  const familyStatusLoading = familyConnections === null;
  const familyStatusKnown = Array.isArray(familyConnections);
  const isFamilyConnected = acceptedConnections.length > 0;
  const displayName = user?.name || (isCaregiver ? 'ผู้ดูแล' : 'ผู้ใช้งาน');

  const startVoice = () => router.push('/voice');

  const markTaken = async (id) => {
    try { await reminderApi.markTaken(id); setReminders((rows) => rows.map((row) => row.id === id ? { ...row, taken: true, completed: true } : row)); }
    catch (err) {
      if (err.status === 404) {
        setReminders((rows) => rows.filter((row) => row.id !== id));
        setError('');
        publishReminderChange({ action: 'removed', reminderId: id });
        return;
      }
      setError(err.message || 'บันทึกการกินยาไม่สำเร็จ');
    }
  };

  if (!user) return <main className="aha-v3-page" aria-busy="true"><p role="status"><T>กำลังตรวจสอบการเข้าสู่ระบบ…</T></p></main>;

  return (
    <div className={`aha-v3-page aha-layout-refresh ${isCaregiver ? 'is-caregiver' : 'is-elderly'}`}><div className="aha-v3-layout"><div className="aha-v3-main">
      <header className="aha-v3-topbar">
        <Brand />
        <button className="aha-v3-voice-pill" onClick={startVoice} type="button"><span><AhaIcon name="mic" size={23} /></span><strong><T>พูดกับ AHA</T></strong></button>
        <div className="aha-v3-top-message"><strong><T>{isCaregiver ? 'ดูแลคนที่คุณรัก' : 'ถามได้ทุกเรื่องสุขภาพ'}</T></strong><span><T>{isCaregiver ? 'ติดตามสถานะจาก AHA ได้ในที่เดียว' : 'AHA พร้อมดูแลคุณ'}</T></span></div>
        <div className="aha-v3-top-actions">
          <button onClick={() => router.push('/notifications')} aria-label="แจ้งเตือน" type="button"><AhaIcon name="bell" size={22} />{notifications.length > 0 && <b>{notifications.length > 9 ? '9+' : notifications.length}</b>}</button>
          <button onClick={() => router.push('/profile')} aria-label="โปรไฟล์" type="button"><span className="aha-v3-user-avatar">{avatar ? <Image src={avatar} alt="" fill sizes="42px" unoptimized /> : displayName.slice(0, 1)}</span></button>
          <button onClick={() => router.push('/profile')} aria-label="ตั้งค่า" type="button"><AhaIcon name="activity" size={21} /></button>
        </div>
      </header>

      <main className="aha-v3-content">{error && <div className="error">{error}</div>}
        <AhaInstallCard />
        <section className="aha-v3-hero aha-welcome">
          <div className="aha-v3-hero-copy">
            <span className="aha-welcome-label"><AhaIcon name="heart" size={17} /> <T>{isCaregiver ? 'ดูแลคนที่คุณรัก' : 'วันดี ๆ เริ่มที่การดูแลตัวเอง'}</T></span>
            <h1><T>สวัสดี</T> {displayName}</h1>
            <p><T>{isCaregiver ? 'วันนี้คุณกำลังดูแลใครอยู่บ้าง?' : 'ดูแลตัวเองไปด้วยกันในทุกวัน'}</T></p>
          </div>
          <div className="aha-welcome-art" aria-hidden="true"><AhaIcon name={isCaregiver ? 'users' : 'heart'} size={64} /><span /><i /></div>
        </section>

        {isCaregiver ? <>
          <section className="aha-v3-feature-row"><article className="aha-v3-card aha-v3-next"><div className="aha-v3-card-title"><T>ผู้สูงอายุที่ดูแล</T><button onClick={() => router.push('/family')} type="button"><T>จัดการ</T><AhaIcon name="arrow" size={15} /></button></div><div className="aha-v3-next-inner"><span className="aha-v3-clock"><AhaIcon name="users" size={42} /></span><div><strong>{caregiverPeople.length}</strong><span><T>คนที่เชื่อมต่อแล้ว</T></span><small><T>เลือกดูตารางยาและสถานะการทานยา</T></small></div></div><button className="aha-v3-primary-button" onClick={() => router.push('/family')} type="button"><AhaIcon name="users" size={18} /><T>ดูแดชบอร์ดผู้ดูแล</T></button></article><div className="aha-v3-action-stack"><button className="aha-v3-action blue" onClick={() => router.push('/family')} type="button"><span className="aha-v3-action-icon"><AhaIcon name="users" size={33} /></span><strong><T>ติดตามผู้สูงอายุ</T></strong><span className="aha-v3-arrow">›</span></button><button className="aha-v3-action blue" onClick={startVoice} type="button"><span className="aha-v3-action-icon"><AhaIcon name="mic" size={33} /></span><strong><T>พูดกับ AHA</T></strong><span className="aha-v3-arrow">›</span></button><button className="aha-v3-action red" onClick={() => router.push('/emergency')} type="button"><span className="aha-v3-action-icon"><AhaIcon name="phone" size={33} /></span><strong><T>ฉุกเฉิน SOS</T></strong><span className="aha-v3-arrow">›</span></button></div></section>
          <section className="aha-v3-metrics-row"><article className="aha-v3-card aha-v3-progress"><div className="aha-v3-card-title"><T>สถานะการทานยาของผู้สูงอายุ วันนี้</T></div><div className="aha-v3-progress-inner"><div className="aha-v3-ring" style={{ '--progress': caregiverToday.length ? `${Math.round((caregiverTaken / caregiverToday.length) * 100)}%` : '0%' }}><span><b>{caregiverTaken}/{caregiverToday.length}</b><T>รายการ</T></span></div><div><strong>{!caregiverToday.length ? 'วันนี้ไม่มีรายการยา' : caregiverWaiting ? `รอติดตาม ${caregiverWaiting} รายการ` : caregiverTaken === caregiverToday.length ? 'วันนี้ครบแล้ว' : 'ที่เหลือยังไม่ถึงเวลา'}</strong><span><T>ดูรายละเอียดและจัดการยาได้จากแดชบอร์ด</T></span></div></div><div className="aha-v3-mini-note"><AhaIcon name="users" size={18} /><T>ระบบจะแจ้งเตือนผู้ดูแลเมื่อเลยเวลาทานยา</T></div></article><article className="aha-v3-card aha-v3-today"><div className="aha-v3-card-title"><T>สถานะยาที่ต้องติดตาม</T></div><div className="aha-v3-mini-timeline">{caregiverToday.slice(0, 3).map((item) => <div className="aha-v3-mini-row" key={item.reminder_id}><span className={medicationTaken(item) ? 'done' : medicationDue(item) ? 'current' : ''} /><time>{timeOf(item.reminder_time)}</time><div><strong>{item.medicine_name}</strong><small><T>{medicationTaken(item) ? 'ผู้สูงอายุทานแล้ว' : medicationDue(item) ? 'รอการยืนยัน' : 'ยังไม่ถึงเวลา'}</T></small></div></div>)}{!caregiverToday.length && <div className="aha-v3-empty-mini"><T>ยังไม่มีรายการยาของผู้สูงอายุ</T></div>}</div></article><article className={`aha-v3-care-card aha-v3-care-card-large ${familyStatusKnown && !isFamilyConnected ? 'disconnected' : ''}`}><div className="aha-v3-care-icon"><AhaIcon name="users" size={32} /></div><div><h2><T>ผู้สูงอายุ:</T><span><T>{familyStatusLoading ? 'กำลังตรวจสอบ…' : !familyStatusKnown ? 'ตรวจสอบสถานะไม่ได้' : isFamilyConnected ? 'เชื่อมต่อแล้ว' : 'ยังไม่ได้เชื่อมต่อ'}</T></span> {familyStatusKnown && <i>●</i>}</h2><p>{!familyStatusKnown ? 'กรุณาลองเปิดหน้านี้ใหม่อีกครั้ง' : isFamilyConnected ? `กำลังดูแล ${acceptedConnections.length} คน` : 'เชื่อมต่อบัญชีผู้สูงอายุเพื่อเริ่มดูแล'}</p></div><button onClick={() => router.push('/family')} aria-label="เปิดศูนย์ดูแล" type="button"><AhaIcon name="chevron" size={25} /></button></article></section>
          <section className="aha-v3-today-card"><div className="aha-v3-section-title"><h2><T>ผู้สูงอายุที่กำลังติดตาม</T></h2><button onClick={() => router.push('/family')} type="button"><T>ดูทั้งหมด</T><AhaIcon name="arrow" size={17} /></button></div>{loading ? <div className="aha-v3-empty"><T>กำลังโหลดข้อมูล…</T></div> : !caregiverPeople.length ? <div className="aha-v3-empty"><T>ยังไม่มีผู้สูงอายุที่เชื่อมต่อ</T><button onClick={() => router.push('/family')} type="button"><T>+ เชื่อมต่อผู้สูงอายุ</T></button></div> : <div className="aha-v3-table">{caregiverPeople.slice(0, 4).map((person) => { const rows = caregiverToday.filter((item) => String(item.user_id) === String(person.user_id)); const status = personMedicationStatus(rows); return <div className="aha-v3-med-row" key={person.user_id}><span className={`aha-v3-dot ${status.tone === 'done' ? 'done' : status.tone === 'wait' ? 'current' : ''}`} /><div><strong>{person.name || 'ผู้สูงอายุ'}</strong><small>{person.phone}</small></div><div className="aha-v3-row-actions"><span className={`aha-v3-status ${status.tone}`}><T>{status.label}</T></span><button className="aha-v3-take-button" onClick={() => router.push('/family')} type="button"><T>ดูสถานะ</T></button></div></div>; })}</div>}</section>
        </> : <>
          <section className="aha-v3-feature-row"><article className="aha-v3-card aha-v3-next"><div className="aha-v3-card-title"><T>ยาครั้งถัดไป</T><button onClick={() => router.push('/reminders')} type="button"><T>ดูทั้งหมด</T><AhaIcon name="arrow" size={15} /></button></div><div className="aha-v3-next-inner"><span className="aha-v3-clock"><AhaIcon name="clock" size={42} /></span><div><strong>{nextReminder ? timeOf(nextReminder.reminder_time) : '--:--'}</strong><span>{nextReminder?.medicine_name || 'ยังไม่มีรายการยา'}</span><small>{nextReminder?.dosage || 'เพิ่มรายการยาเพื่อเริ่มติดตาม'}</small></div></div><button className="aha-v3-primary-button" onClick={() => router.push('/reminders')} type="button"><AhaIcon name="bell" size={18} /> <T>{nextReminder ? 'เตือนยาเมื่อถึงเวลา' : 'เพิ่มรายการยา'}</T></button></article><div className="aha-v3-action-stack"><button className="aha-v3-action blue" onClick={() => router.push('/reminders')} type="button"><span className="aha-v3-action-icon"><AhaIcon name="pill" size={33} /></span><strong><T>จัดการยา</T></strong><span className="aha-v3-arrow">›</span></button><button className="aha-v3-action blue" onClick={startVoice} type="button"><span className="aha-v3-action-icon"><AhaIcon name="mic" size={33} /></span><strong><T>พูดกับ AHA</T></strong><span className="aha-v3-arrow">›</span></button><button className="aha-v3-action red" onClick={() => router.push('/emergency')} type="button"><span className="aha-v3-action-icon"><AhaIcon name="phone" size={33} /></span><strong><T>ฉุกเฉิน SOS</T></strong><span className="aha-v3-arrow">›</span></button></div></section>
          <section className="aha-v3-metrics-row"><article className="aha-v3-card aha-v3-progress"><div className="aha-v3-card-title"><T>ความคืบหน้าการกินยา วันนี้</T></div><div className="aha-v3-progress-inner"><div className="aha-v3-ring" style={{ '--progress': total ? `${Math.round((completed / total) * 100)}%` : '0%' }}><span><b>{completed}/{total}</b><T>รายการ</T></span></div><div><strong><T>{completed ? 'เยี่ยมมาก!' : 'เริ่มต้นได้เลย'}</T></strong><span><T>คุณดูแลตัวเองได้ดีมากในวันนี้</T></span></div></div><div className="aha-v3-mini-note"><AhaIcon name="check" size={18} /><T>ติดตามการกินยาได้จากรายการด้านล่าง</T></div></article><article className="aha-v3-card aha-v3-today"><div className="aha-v3-card-title"><T>ไทม์ไลน์การกินยา วันนี้</T></div><div className="aha-v3-mini-timeline">{activeReminders.slice(0, 3).map((item, index) => { const done = item.completed || item.taken || item.is_taken; return <div className="aha-v3-mini-row" key={item.id || `${item.medicine_name}-${item.reminder_time}`}><span className={done ? 'done' : index === 0 ? 'current' : ''} /><time>{timeOf(item.reminder_time)}</time><div><strong>{item.medicine_name}</strong><small><T>{done ? 'กินแล้ว' : index === 0 ? 'รอถึงเวลา' : 'รออยู่'}</T></small></div></div>; })}{!activeReminders.length && <div className="aha-v3-empty-mini"><T>ยังไม่มีรายการยา</T></div>}</div></article><article className={`aha-v3-care-card aha-v3-care-card-large ${familyStatusKnown && !isFamilyConnected ? 'disconnected' : ''}`} onClick={() => router.push('/family')}><div className="aha-v3-care-icon"><AhaIcon name="users" size={32} /></div><div><h2><T>ผู้ดูแล:</T><span><T>{familyStatusLoading ? 'กำลังตรวจสอบ…' : !familyStatusKnown ? 'ตรวจสอบสถานะไม่ได้' : isFamilyConnected ? 'เชื่อมต่อแล้ว' : 'ยังไม่ได้เชื่อมต่อ'}</T></span> {familyStatusKnown && <i>●</i>}</h2><p>{!familyStatusKnown ? 'กรุณาลองเปิดหน้านี้ใหม่อีกครั้ง' : isFamilyConnected ? `เชื่อมต่อผู้ดูแลแล้ว ${acceptedConnections.length} คน` : 'เชื่อมต่อบัญชีผู้ดูแลเพื่อให้ครอบครัวช่วยติดตาม'}</p></div><AhaIcon name="chevron" size={25} /></article></section>
          <section className="aha-v3-today-card"><div className="aha-v3-section-title"><h2><T>รายการยาวันนี้</T></h2><button onClick={() => router.push('/reminders')} type="button"><T>ดูทั้งหมด</T><AhaIcon name="arrow" size={17} /></button></div>{loading ? <div className="aha-v3-empty"><T>กำลังโหลดข้อมูล…</T></div> : !activeReminders.length ? <div className="aha-v3-empty"><T>ยังไม่มีรายการยา</T><button onClick={() => router.push('/reminders')} type="button"><T>+ เพิ่มรายการยา</T></button></div> : <div className="aha-v3-table">{activeReminders.slice(0, 4).map((item, index) => { const done = item.completed || item.taken || item.is_taken; return <div className="aha-v3-med-row" key={item.id || index}><time>{timeOf(item.reminder_time)}</time><span className={`aha-v3-dot ${done ? 'done' : index === 0 ? 'current' : ''}`} /><div><strong>{item.medicine_name}</strong><small>{item.dosage || '1 รายการ'}</small></div><div className="aha-v3-row-actions">{!done && item.snooze_until && new Date(item.snooze_until).getTime() > Date.now() ? <span className="aha-v3-status wait"><T>เลื่อนการเตือนแล้ว</T></span> : <StatusPill done={done} current={index === 0} />}{!done && <button className="aha-v3-take-button" onClick={() => markTaken(item.id)} type="button"><T>กินแล้ว</T></button>}</div></div>; })}</div>}</section>
        </>}
        <section className="aha-v3-bottom-grid"><article className="aha-v3-wellness"><AhaIcon name="heart" size={34} /><div><h2><T>{isCaregiver ? 'ดูแลคนที่รัก... ทำได้ทุกวัน' : 'สุขภาพดี... ทำได้ทุกวัน'}</T></h2><p><T>{isCaregiver ? 'AHA ช่วยให้คุณติดตามสิ่งสำคัญได้ง่ายขึ้น' : 'AHA อยู่เคียงข้างคุณเสมอ'}</T></p></div><span>〰</span></article><article className="aha-v3-wellness aha-v3-wellness-photo"><div><h2><T>{isCaregiver ? 'ติดตามยาอย่างใกล้ชิด โดยไม่รบกวนการใช้ชีวิต' : 'ดูแลตัวเองไปด้วยกันในทุกวัน'}</T></h2><p><T>{isCaregiver ? 'ทุกการเปลี่ยนแปลงตารางยาจะแจ้งให้ผู้สูงอายุทราบ' : 'สุขภาพดี เริ่มได้จากสิ่งเล็ก ๆ ในทุกวัน'}</T></p></div></article></section>
        <SponsorCard />
      </main>
    </div></div></div>
  );
}
