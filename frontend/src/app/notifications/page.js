'use client';

import { T } from '../../components/Language';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AhaIcon from '../../components/AhaIcon';
import { authApi, notificationApi } from '../../services/api';
import { groupNotifications, notificationTime } from '../../services/notification-view';

const listOf = (result) => Array.isArray(result)
  ? result
  : Array.isArray(result?.data)
    ? result.data
    : Array.isArray(result?.notifications)
      ? result.notifications
      : [];

const unreadTotal = (rows) => rows.filter((item) => !item.is_read).length;

function publishUnreadCount(rows) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('aha-notifications-count', {
    detail: { count: unreadTotal(rows) },
  }));
}

function kindFor(type) {
  const value = String(type);
  return value.includes('emergency') ? 'emergency'
    : /medicine|reminder/.test(value) ? 'medicine'
      : /family|connection|caregiver/.test(value) ? 'family' : 'system';
}
function iconFor(type) {
  return { emergency: 'warning', medicine: 'pill', family: 'users', system: 'bell' }[kindFor(type)];
}

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const unreadCount = unreadTotal(items);
  const groups = groupNotifications(items, filter);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = listOf(await notificationApi.list());
      setItems(rows);
    } catch (err) {
      if (err.status === 401) {
        router.replace('/login');
        return;
      }
      setError(err.message || 'โหลดแจ้งเตือนไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    let active = true;
    authApi.me()
      .then(() => { if (active) load(); })
      .catch(() => { if (active) router.replace('/login'); });
    return () => { active = false; };
  }, [load, router]);

  useEffect(() => {
    publishUnreadCount(items);
  }, [items]);

  const updateItems = (updater) => {
    setItems(updater);
  };

  const read = async (id) => {
    try {
      await notificationApi.markRead(id);
      updateItems((rows) => rows.map((item) => item.id === id ? { ...item, is_read: true } : item));
    } catch (err) {
      setError(err.message || 'อัปเดตการแจ้งเตือนไม่สำเร็จ');
    }
  };

  const allRead = async () => {
    try {
      await notificationApi.markAllRead();
      updateItems((rows) => rows.map((item) => ({ ...item, is_read: true })));
    } catch (err) {
      setError(err.message || 'อัปเดตการแจ้งเตือนไม่สำเร็จ');
    }
  };

  const remove = async (id) => {
    try {
      await notificationApi.remove(id);
      updateItems((rows) => rows.filter((item) => item.id !== id));
    } catch (err) {
      setError(err.message || 'ลบการแจ้งเตือนไม่สำเร็จ');
    }
  };

  return (
    <div className="aha-page aha-notifications-page aha-layout-refresh">
      <div className="aha-shell">
        <header className="topbar aha-notifications-topbar">
          <div className="brand">
            <button className="icon-btn aha-notifications-back" onClick={() => router.push('/home')} aria-label="กลับหน้าหลัก">
              <AhaIcon name="arrow" size={21} />
            </button>
            <div className="brand-mark"><AhaIcon name="bell" /></div>
            <h1><T>การแจ้งเตือน</T></h1>
            {unreadCount > 0 && <b className="aha-notifications-count" aria-label={`ยังไม่ได้อ่าน ${unreadCount} รายการ`}>{unreadCount > 99 ? '99+' : unreadCount}</b>}
          </div>
          <button className="btn btn-soft aha-read-all" onClick={allRead} disabled={unreadCount === 0}>
            <AhaIcon name="check" /> <span><T>อ่านทั้งหมด</T></span>
          </button>
        </header>

        <div className="aha-inbox-toolbar" aria-label="ตัวกรองการแจ้งเตือน">
          <button type="button" aria-pressed={filter === 'all'} className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}><T>ทั้งหมด</T></button>
          <button type="button" aria-pressed={filter === 'unread'} className={filter === 'unread' ? 'selected' : ''} onClick={() => setFilter('unread')}><T>ยังไม่อ่าน</T>{unreadCount > 0 && <span>{unreadCount}</span>}</button>
        </div>

        {error && <div className="error" style={{ margin: '18px 0' }} role="alert">{error}</div>}

        <section className="aha-inbox" aria-label="รายการการแจ้งเตือน" aria-busy={loading}>
          {loading ? <div className="empty" role="status"><T>กำลังโหลด…</T></div> : groups.length === 0 ? <div className="empty"><AhaIcon name="bell" size={34} /><h2><T>{filter === 'unread' ? 'อ่านครบแล้ว' : 'ยังไม่มีการแจ้งเตือน'}</T></h2><p><T>{filter === 'unread' ? 'ดูประวัติได้ที่แท็บทั้งหมด' : 'เมื่อมีเหตุการณ์ใหม่ ระบบจะแสดงที่นี่'}</T></p></div> : groups.map((group) => <section className="aha-inbox-group" key={group.key} aria-label={group.label}>
            <h2><T>{group.label}</T></h2>
            <div className="aha-notifications-list">{group.items.map((notification) => <article className={`notification-item ${kindFor(notification.type)} ${!notification.is_read ? 'unread' : ''}`} key={notification.id}>
              <div className="notification-icon"><AhaIcon name={iconFor(notification.type)} /></div>
              <button type="button" className="aha-notification-copy aha-inbox-open" onClick={() => notification.is_read ? undefined : read(notification.id)} aria-label={`อ่านการแจ้งเตือน ${notification.title || ''}`}>
                <span className="aha-notification-title">{notification.title}</span>
                <span className="aha-notification-message">{notification.message}</span>
                <span className="aha-inbox-meta"><time className="aha-notification-date" dateTime={notification.created_at || undefined}>{notificationTime(notification.created_at)}</time><span className="aha-inbox-read-state"><T>{notification.is_read ? 'อ่านแล้ว' : 'ยังไม่อ่าน'}</T></span></span>
              </button>
              <div className="aha-inbox-row-tools">
                {!notification.is_read && <span className="aha-inbox-unread-dot" aria-hidden="true" />}
                <details className="aha-inbox-menu"><summary aria-label={`ตัวเลือกการแจ้งเตือน ${notification.title || ''}`}><span aria-hidden="true">⋯</span></summary>
                  <div className="aha-notification-actions">
                    <button type="button" className="btn btn-soft" onClick={() => read(notification.id)} disabled={notification.is_read} aria-label={`ทำเครื่องหมายว่าอ่าน ${notification.title || ''}`}><AhaIcon name="check" size={17} /><span><T>{notification.is_read ? 'อ่านแล้ว' : 'ทำเครื่องหมายว่าอ่าน'}</T></span></button>
                    <button type="button" className="btn btn-danger" onClick={() => remove(notification.id)} aria-label={`ลบการแจ้งเตือน ${notification.title || ''}`}><AhaIcon name="trash" size={17} /><span><T>ลบการแจ้งเตือน</T></span></button>
                  </div>
                </details>
              </div>
            </article>)}</div>
          </section>)}
        </section>

        <nav className="footer-nav">
          <div className="footer-nav-inner">
            <button className="footer-link" onClick={() => router.push('/home')}><AhaIcon name="home" size={20} /><span><T>หน้าหลัก</T></span></button>
            <button className="footer-link" onClick={() => router.push('/reminders')}><AhaIcon name="pill" size={20} /><span><T>ยา</T></span></button>
            <button className="footer-link active"><AhaIcon name="bell" size={20} /><span><T>แจ้งเตือน</T></span></button>
            <button className="footer-link" onClick={() => router.push('/emergency')}><AhaIcon name="warning" size={20} /><span><T>ฉุกเฉิน</T></span></button>
          </div>
        </nav>
      </div>

    </div>
  );
}

