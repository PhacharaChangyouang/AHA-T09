'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getUser } from '../services/auth';
import { notificationApi, reminderApi } from '../services/api';
import { completeReminderAlert, isActionableReminder, REMINDER_CHANGE_CHANNEL } from '../services/reminder-changes';
import {
  enableAhaPush,
  getAhaPushPermission,
  getAhaPushSubscription,
  isAhaPushEnabledLocally,
  setAhaPushPreference,
} from '../services/push';

const SEEN_KEY = 'aha_seen_medicine_notifications';
const POLL_INTERVAL_MS = 30_000;
const RATE_LIMIT_BACKOFF_MS = 60_000;

function getSeenIds() {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch { return []; }
}
function rememberId(id) {
  if (!id) return;
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...new Set([...getSeenIds(), id])].slice(-100))); } catch (_) {}
}
function normalizeNotification(item) {
  if (!item) return null;
  return {
    ...item,
    id: item.id || item.notificationId || null,
    related_id: item.related_id || item.relatedId || null,
    title: item.title || 'AHA แจ้งเตือน',
    message: item.message || 'มีการแจ้งเตือนจาก AHA',
    type: item.type || 'notification',
  };
}
function isMedicineNotification(item) {
  const n = normalizeNotification(item);
  return n?.type === 'medicine_reminder' && n.related_id;
}

export default function MedicationNotificationManager() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [alert, setAlert] = useState(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushPreferred, setPushPreferred] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [permission, setPermission] = useState('default');
  const [showPushHint,setShowPushHint]=useState(true);
  const [showBell,setShowBell]=useState(true);
  const handledActions = useRef(new Set());
  const activeAlert = useRef(null);
  const alertRevision = useRef(0);
  const bellDrag = useRef({ active:false, moved:false, pointerId:null, dx:0, dy:0 });
  const [bellPosition,setBellPosition]=useState(null);
  const [hintDismissed, setHintDismissed] = useState(false);

  useEffect(() => {
    if (!authenticated || hintDismissed) return undefined;
    setShowBell(true); setShowPushHint(true);
    // A blocked/unsupported browser must not leave an overlay on every page.
    // This timeout is independent of subscription repair and permission changes.
    const timer = window.setTimeout(() => {
      setShowBell(false); setShowPushHint(false); setHintDismissed(true);
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [authenticated, hintDismissed]);

  useEffect(() => {
    if (!error || alert) return undefined;
    const timer = window.setTimeout(() => setError(''), 8000);
    return () => window.clearTimeout(timer);
  }, [error, alert]);

  useEffect(() => {
    try { const saved=JSON.parse(localStorage.getItem('aha_bell_position') || 'null'); if(saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) setBellPosition(saved); } catch (_) {}
  }, []);

  const startBellDrag = (event) => {
    if (busy) return;
    const rect=event.currentTarget.getBoundingClientRect();
    bellDrag.current={active:true,moved:false,pointerId:event.pointerId,dx:event.clientX-rect.left,dy:event.clientY-rect.top};
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const moveBell = (event) => {
    if(!bellDrag.current.active) return;
    const x=Math.max(6,Math.min(window.innerWidth-58,event.clientX-bellDrag.current.dx));
    const y=Math.max(6,Math.min(window.innerHeight-58,event.clientY-bellDrag.current.dy));
    if(Math.abs(event.movementX||0)+Math.abs(event.movementY||0)>1) bellDrag.current.moved=true;
    setBellPosition({x,y});
  };
  const endBellDrag = () => {
    if(!bellDrag.current.active) return;
    if(bellPosition) localStorage.setItem('aha_bell_position',JSON.stringify(bellPosition));
    window.setTimeout(()=>{bellDrag.current.active=false;bellDrag.current.moved=false;},0);
  };

  useEffect(() => {
    let active = true;
    const syncAuth = () => {
      if (!active) return;
      setAuthenticated(Boolean(getUser()));
      if (typeof window !== 'undefined' && 'Notification' in window) setPermission(Notification.permission);
    };
    // AuthPage and protected pages own session restoration. Calling /me here
    // as well caused two simultaneous session checks and refresh races.
    syncAuth();
    window.addEventListener('aha-auth-change', syncAuth);
    return () => { active = false; window.removeEventListener('aha-auth-change', syncAuth); };
  }, []);

  const dismissAlert = useCallback((notification, acknowledge = true) => {
    if (notification?.id) {
      rememberId(notification.id);
      if (acknowledge) notificationApi.markRead(notification.id).catch(() => {});
    }
    if (!notification || activeAlert.current?.id === notification.id) {
      activeAlert.current = null;
      setAlert(null);
      setError('');
    }
  }, []);

  const showAlert = useCallback(async (rawNotification) => {
    const notification = normalizeNotification(rawNotification);
    if (!getUser() || !isMedicineNotification(notification) || getSeenIds().includes(notification.id)) return;
    const revision = alertRevision.current;
    try {
      const result = await reminderApi.today();
      if (!getUser() || revision !== alertRevision.current) return;
      const reminder = (result?.data || []).find((item) => String(item.id) === String(notification.related_id));
      if (!isActionableReminder(reminder)) { dismissAlert(notification); return; }
      if (activeAlert.current) return;
      rememberId(notification.id);
      activeAlert.current = notification;
      setError('');
      setAlert(notification);
    } catch (_) { /* Do not show an unverified stale reminder when offline. */ }
  }, [dismissAlert]);

  useEffect(() => {
    if (!authenticated) return undefined;
    const reconcile = async (event) => {
      alertRevision.current += 1;
      const detail = event?.detail || {};
      const current = activeAlert.current;
      if (!current) return;
      if (String(detail.reminderId) === String(current.related_id) &&
          ['taken', 'snoozed', 'removed', 'disabled', 'updated'].includes(detail.action)) {
        dismissAlert(current, !handledActions.current.has(String(current.related_id)));
        return;
      }
      try {
        const revision = alertRevision.current;
        const result = await reminderApi.today();
        if (revision !== alertRevision.current) return;
        const reminder = (result?.data || []).find((item) => String(item.id) === String(current.related_id));
        if (!isActionableReminder(reminder)) dismissAlert(current);
      } catch (_) {}
    };
    window.addEventListener('aha-reminders-refresh', reconcile);
    let channel;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel(REMINDER_CHANGE_CHANNEL);
        channel.onmessage = (event) => window.dispatchEvent(new CustomEvent('aha-reminders-refresh', { detail: event.data }));
      }
    } catch (_) {}
    return () => { window.removeEventListener('aha-reminders-refresh', reconcile); channel?.close(); };
  }, [authenticated, dismissAlert]);

  const syncPushState = useCallback(async () => {
    const currentUser = getUser();
    if (!currentUser) {
      setPushEnabled(false);
      setReady(true);
      return;
    }
    const preferred = isAhaPushEnabledLocally(currentUser.id);
    setPushPreferred(preferred);
    if (!preferred) {
      setPushEnabled(false);
      setReady(true);
      return;
    }
    try {
      const currentPermission = getAhaPushPermission();
      setPermission(currentPermission);
      if (currentPermission !== 'granted') {
        setPushEnabled(false);
        return;
      }

      // Permission already exists, so this is safe to repair automatically
      // without opening a browser permission prompt.
      await enableAhaPush({ requestPermission: false, userId: currentUser.id });
      const subscription = await getAhaPushSubscription();
      setPushEnabled(Boolean(subscription));
    } catch (err) {
      console.warn('AHA push status unavailable:', err);
      setPushEnabled(false);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    const syncVoicePreference = () => syncPushState();
    window.addEventListener('aha-push-preference-change', syncVoicePreference);
    return () => window.removeEventListener('aha-push-preference-change', syncVoicePreference);
  }, [syncPushState]);

  const activatePushOnDevice = async () => {
    const currentUser = getUser();
    if (!currentUser) return;
    setBusy(true); setError('');
    setAhaPushPreference(true, currentUser.id);
    setPushPreferred(true);
    try {
      await enableAhaPush({ requestPermission: true, userId: currentUser.id });
      setPermission(getAhaPushPermission());
      setPushEnabled(true);
      setShowPushHint(false);
      window.setTimeout(() => setShowBell(false), 1800);
    } catch (err) {
      setPermission(getAhaPushPermission());
      setPushEnabled(false);
      setError(err?.message || 'ยังเปิดการแจ้งเตือนบนอุปกรณ์นี้ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const pollUnread = useCallback(async () => {
    if (!getUser()) return POLL_INTERVAL_MS;
    try {
      const result = await notificationApi.unread();
      const notifications = Array.isArray(result?.data) ? result.data : [];
      window.dispatchEvent(new CustomEvent('aha-notifications-count', { detail: { count: notifications.length } }));
      window.dispatchEvent(new CustomEvent('aha-reminders-refresh'));
      const medicine = notifications.find((item) => isMedicineNotification(item) && !getSeenIds().includes(item.id));
      if (medicine) await showAlert(medicine);
      return POLL_INTERVAL_MS;
    } catch (err) {
      if (err?.status !== 401) console.warn('AHA notification polling failed:', err);
      return err?.status === 429 ? RATE_LIMIT_BACKOFF_MS : POLL_INTERVAL_MS;
    }
  }, [showAlert]);

  const handleAction = useCallback(async (action, rawNotification) => {
    const notification = normalizeNotification(rawNotification);
    if (!notification?.id || !notification?.related_id) return;
    const actionKey = String(notification.related_id);
    if (handledActions.current.has(actionKey)) return;
    handledActions.current.add(actionKey);
    setBusy(true);
    setError('');
    try {
      await completeReminderAlert(action, notification, { reminderApi, notificationApi });
      dismissAlert(notification, false);
      window.dispatchEvent(new CustomEvent('aha-notifications-count', { detail: { delta: -1 } }));
    } catch (err) {
      handledActions.current.delete(actionKey);
      setError(err?.message || 'ไม่สามารถบันทึกการตอบสนองได้');
    } finally {
      handledActions.current.delete(actionKey);
      setBusy(false);
    }
  }, [dismissAlert]);

  const handleServiceWorkerMessage = useCallback((event) => {
    const message = event?.data;
    if (!message) return;
    if (message.type === 'AHA_MEDICINE_REMINDER' && message.notification) showAlert(message.notification);
    if (message.type === 'AHA_GENERAL_NOTIFICATION') window.dispatchEvent(new CustomEvent('aha-reminders-refresh'));
    if (message.type === 'AHA_NOTIFICATION_ACTION') handleAction(message.action, message.notification);
  }, [handleAction, showAlert]);

  useEffect(() => {
    if (!authenticated) {
      setPushEnabled(false);
      setPushPreferred(true);
      setReady(false);
      alertRevision.current += 1;
      activeAlert.current = null;
      setAlert(null);
      return undefined;
    }
    syncPushState();
    if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    return () => {
      if ('serviceWorker' in navigator) navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [authenticated, handleServiceWorkerMessage, syncPushState]);

  useEffect(() => {
    if (!ready || !authenticated) return undefined;
    let stopped = false;
    let running = false;
    let timer = null;

    const schedule = (delay) => {
      if (stopped || document.hidden) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(run, delay);
    };

    const run = async () => {
      if (stopped || running || document.hidden) return;
      running = true;
      const nextDelay = await pollUnread();
      running = false;
      schedule(nextDelay);
    };

    const handleVisibilityChange = () => {
      window.clearTimeout(timer);
      if (!document.hidden) run();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    run();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [authenticated, ready, pollUnread]);

  useEffect(() => {
    if (!authenticated) return undefined;
    const url = new URL(window.location.href);
    const action = url.searchParams.get('aha_action');
    const reminderId = url.searchParams.get('reminderId');
    const notificationId = url.searchParams.get('notificationId');
    if (!action || !reminderId || !notificationId) return undefined;
    handleAction(action, { id: notificationId, related_id: reminderId, type: 'medicine_reminder' });
    url.searchParams.delete('aha_action');
    url.searchParams.delete('reminderId');
    url.searchParams.delete('notificationId');
    window.history.replaceState({}, '', url.toString());
    return undefined;
  }, [authenticated, handleAction]);

  const openNotificationSettings = () => {
    if (bellDrag.current.moved) return;
    setShowPushHint(false); setShowBell(false); setHintDismissed(true); setError('');
    router.push('/profile');
  };

  if (!authenticated) return null;

  return (
    <>
      {showBell && <button
        type="button"
        onClick={openNotificationSettings}
        onPointerDown={startBellDrag}
        onPointerMove={moveBell}
        onPointerUp={endBellDrag}
        onPointerCancel={endBellDrag}
        onContextMenu={(event)=>event.preventDefault()}
        aria-label={pushEnabled ? 'การแจ้งเตือน AHA พร้อมใช้งาน' : 'ไปตั้งค่าการแจ้งเตือน AHA'}
        title="ตั้งค่าการแจ้งเตือนยา"
        style={{
          position: 'fixed', ...(bellPosition ? {left:bellPosition.x,top:bellPosition.y,right:'auto'} : {right:14,top:'max(76px, env(safe-area-inset-top) + 62px)'}), zIndex: 10050,
          width: 52, height: 52, borderRadius: '50%', border: '1px solid #d8eaf2',
          background: 'rgba(255,255,255,.96)', color: '#0f9b76', boxShadow: '0 8px 22px rgba(28,108,148,.16)',
          cursor: busy ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          padding: 0, fontSize: 29, lineHeight: 1, touchAction:'none', userSelect:'none', WebkitUserSelect:'none', WebkitTouchCallout:'none',
        }}
      >
        <span className="aha-notification-emoji" aria-hidden="true">🔔</span>
        <span className="aha-notification-status" aria-hidden="true" />
      </button>}

      {showBell && showPushHint && ready && (
        <div role="region" aria-label="คำแนะนำการแจ้งเตือนยา" style={{ position: 'fixed', right: 14, top: 'max(132px, env(safe-area-inset-top) + 118px)', zIndex: 10000, width: 'min(330px, calc(100vw - 28px))', boxSizing: 'border-box', background: 'var(--aha-surface,#fff)', borderRadius: 16, padding: '13px 15px', boxShadow: '0 10px 35px rgba(0,0,0,.16)', border: '1px solid var(--aha-border,#dbe5ee)', color: 'var(--aha-text,#0f172a)', fontSize: 15 }}>
          <button type="button" aria-label="ปิดคำแนะนำการแจ้งเตือน" onClick={() => { setShowPushHint(false); setShowBell(false); setHintDismissed(true); }} style={{ position: 'absolute', right: 4, top: 4, width: 44, height: 44, border: 0, borderRadius: 10, background: 'transparent', color: 'inherit', fontSize: 26, cursor: 'pointer' }}>×</button>
          <strong style={{ display: 'block', paddingRight: 34 }}>{pushEnabled || !pushPreferred ? 'อย่าลืมตั้งค่าการแจ้งเตือนยา' : 'เปิดการแจ้งเตือนยาให้เรียบร้อย'}</strong>
          <div style={{ marginTop: 4, color: 'var(--aha-text-secondary,#475569)', lineHeight: 1.45 }}>
            {pushEnabled || !pushPreferred
              ? 'จัดการการแจ้งเตือนได้ในหน้าโปรไฟล์ ข้อความนี้จะปิดอัตโนมัติ'
              : permission === 'denied'
                ? 'AHA ตั้งค่าเป็นเปิดไว้แล้ว แต่ Browser กำลังบล็อก Notification กรุณาอนุญาตในการตั้งค่าเว็บไซต์'
                : permission === 'unsupported'
                  ? 'AHA ตั้งค่าเป็นเปิดไว้แล้ว แต่อุปกรณ์นี้ยังไม่รองรับ Push Notification'
                  : 'AHA ตั้งค่าเป็นเปิดไว้แล้ว กรุณากดอนุญาตบนอุปกรณ์นี้อีกหนึ่งครั้งเพื่อให้แจ้งเตือนได้แม้ปิดหน้าเว็บ'}
          </div>
          {!pushEnabled && pushPreferred && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {permission !== 'denied' && permission !== 'unsupported' && <button type="button" disabled={busy} onClick={activatePushOnDevice} style={{ minHeight: 42, border: 0, borderRadius: 10, background: '#0f9b76', color: '#fff', padding: '8px 13px', fontWeight: 600, cursor: busy ? 'wait' : 'pointer' }}>{busy ? 'กำลังเปิด…' : 'อนุญาตการแจ้งเตือน'}</button>}
              <button type="button" onClick={openNotificationSettings} style={{ minHeight: 42, border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff', color: '#334155', padding: '8px 13px', fontWeight: 600, cursor: 'pointer' }}>ไปหน้าโปรไฟล์</button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div role="alert" style={{ position: 'fixed', left: '50%', bottom: 'max(100px, env(safe-area-inset-bottom) + 100px)', transform: 'translateX(-50%)', zIndex: 10052, background: '#991b1b', color: '#fff', padding: '12px 52px 12px 16px', borderRadius: 12, width: 'max-content', maxWidth: 'calc(100vw - 32px)', boxSizing: 'border-box', overflowWrap: 'anywhere', fontSize: 16, lineHeight: 1.5 }}>
          <span>{error}</span>
          <button type="button" aria-label="ปิดข้อความสถานะการแจ้งเตือน" onClick={() => setError('')} style={{ position: 'absolute', right: 4, top: 4, width: 40, height: 40, background: 'transparent', border: 0, color: 'inherit', fontSize: 24, cursor: 'pointer' }}>×</button>
        </div>
      )}

      {alert && (
        <div role="dialog" aria-modal="true" aria-labelledby="aha-medicine-alert-title" style={{ position: 'fixed', inset: 0, zIndex: 10003, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(15,23,42,.62)', backdropFilter: 'blur(5px)' }}>
          <div style={{ position: 'relative', width: 'min(520px, 100%)', background: '#fff', borderRadius: 26, padding: '26px 22px 22px', boxShadow: '0 24px 70px rgba(0,0,0,.3)', textAlign: 'center', border: `4px solid ${alert.title?.includes('เลยเวลา') ? '#f59e0b' : '#0ea981'}` }}>
            <button type="button" onClick={() => dismissAlert(alert)} aria-label="ปิดการแจ้งเตือนยา" title="ปิด" style={{ position:'absolute', right:12, top:10, width:42, height:42, border:'1px solid #d9e1e8', borderRadius:'50%', background:'#fff', color:'#334155', fontSize:28, lineHeight:1, cursor:'pointer', display:'grid', placeItems:'center' }}>×</button>
            <Image src="/icons/aha-icon.svg" alt="AHA" width={70} height={70} style={{ display: 'block', margin: '0 auto 12px', borderRadius: 18 }} />
            <div style={{ fontSize: 18, color: alert.title?.includes('เลยเวลา') ? '#b45309' : '#0b7d63', marginBottom: 7 }}>{alert.title || 'AHA แจ้งเตือน'}</div>
            <h2 id="aha-medicine-alert-title" style={{ margin: 0, fontSize: 'clamp(28px, 6vw, 36px)', lineHeight: 1.2, color: '#0f172a', fontWeight: 700 }}>{alert.title?.includes('เลยเวลา') ? 'เลยเวลาทานยาแล้ว' : 'ถึงเวลาทานยาแล้ว'}</h2>
            <p style={{ margin: '14px 0 24px', fontSize: 'clamp(20px, 4.5vw, 24px)', lineHeight: 1.55, color: '#334155', fontWeight: 400 }}>{alert.message}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button type="button" disabled={busy} onClick={() => handleAction('snooze', alert)} style={{ minHeight: 64, borderRadius: 15, border: '2px solid #168ee0', background: '#eef8ff', color: '#075b95', fontSize: 'clamp(17px, 4vw, 21px)', cursor: busy ? 'wait' : 'pointer' }}>เลื่อน 10 นาที</button>
              <button type="button" disabled={busy} onClick={() => handleAction('taken', alert)} style={{ minHeight: 64, borderRadius: 15, border: 0, background: '#0ea981', color: '#fff', fontSize: 'clamp(18px, 4vw, 22px)', cursor: busy ? 'wait' : 'pointer' }}>ทานยาแล้ว</button>
            </div>
            <div style={{ marginTop: 13, color: '#64748b', fontSize: 15, lineHeight: 1.45 }}>หากยังไม่ยืนยัน ระบบจะแจ้งเตือนอีกครั้งเมื่อเลยเวลา 10 นาที</div>
          </div>
        </div>
      )}
    </>
  );
}

