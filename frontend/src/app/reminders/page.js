'use client';

import { T } from '../../components/Language';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AhaIcon from '../../components/AhaIcon';
import { saveSession } from '../../services/auth';
import { authApi, reminderApi } from '../../services/api';

const days = [
  ['monday', 'จ'],
  ['tuesday', 'อ'],
  ['wednesday', 'พ'],
  ['thursday', 'พฤ'],
  ['friday', 'ศ'],
  ['saturday', 'ส'],
  ['sunday', 'อา'],
];

const blank = {
  medicine_name: '',
  dosage: '',
  reminder_time: '08:00',
  frequency: 'daily',
  days_of_week: days.map((item) => item[0]),
  start_date: '',
  end_date: '',
  is_active: true,
};

const listOf = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.reminders)) return response.reminders;
  return [];
};

export default function RemindersPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await reminderApi.list();
      setItems(listOf(response));
    } catch (err) {
      if (err.status === 401) {
        router.replace('/login');
        return;
      }
      setError(err.message || 'โหลดรายการไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    let active = true;
    authApi.me().then((result) => {
      if (!active || !result?.user) return;
      saveSession({ user: result.user });
      return load();
    }).catch(() => { if (active) router.replace('/login'); });
    return () => { active = false; };
  }, [router, load]);

  useEffect(() => {
    window.addEventListener('aha-reminders-refresh', load);
    return () => window.removeEventListener('aha-reminders-refresh', load);
  }, [load]);

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) =>
        String(a.reminder_time || '').localeCompare(String(b.reminder_time || ''))
      ),
    [items]
  );

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleDay = (day) => {
    setForm((current) => ({
      ...current,
      days_of_week: current.days_of_week.includes(day)
        ? current.days_of_week.filter((item) => item !== day)
        : [...current.days_of_week, day],
    }));
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...blank });
    setOpen(true);
    setError('');
    setSuccess('');
  };

  const openEdit = (item) => {
    setEditing(item.id);
    setForm({
      ...blank,
      ...item,
      medicine_name: String(item.medicine_name ?? ''),
      dosage: String(item.dosage ?? ''),
      reminder_time: String(item.reminder_time || '08:00').slice(0, 5),
      days_of_week:
        Array.isArray(item.days_of_week) && item.days_of_week.length
          ? item.days_of_week
          : blank.days_of_week,
    });
    setOpen(true);
    setError('');
    setSuccess('');
  };

  const save = async (event) => {
    event.preventDefault();

    const medicineName = String(form.medicine_name ?? '').trim();
    const dosage = String(form.dosage ?? '').trim();

    if (!medicineName) {
      setError('กรุณาระบุชื่อยา');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        ...form,
        medicine_name: medicineName,
        dosage: dosage || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };

      if (editing) {
        await reminderApi.update(editing, payload);
        setSuccess('แก้ไขการเตือนแล้ว');
      } else {
        await reminderApi.create(payload);
        setSuccess('เพิ่มการเตือนแล้ว');
      }

      setOpen(false);
      await load();
    } catch (err) {
      setError(err.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (item) => {
    try {
      await reminderApi.updateStatus(item.id, !item.is_active);
      setItems((current) =>
        current.map((row) =>
          row.id === item.id
            ? { ...row, is_active: !row.is_active }
            : row
        )
      );
    } catch (err) {
      setError(err.message || 'เปลี่ยนสถานะไม่สำเร็จ');
    }
  };

  const remove = async (item) => {
    if (!window.confirm('ลบการเตือน ' + item.medicine_name + ' หรือไม่?')) {
      return;
    }

    try {
      await reminderApi.remove(item.id);
      setItems((current) => current.filter((row) => row.id !== item.id));
      setSuccess('ลบรายการแล้ว');
    } catch (err) {
      setError(err.message || 'ลบไม่สำเร็จ');
    }
  };

  return (
    <div className="aha-page aha-layout-refresh aha-medicines-page">
      <div className="aha-shell">
        <header className="topbar">
          <div className="brand">
            <button
              className="icon-btn"
              onClick={() => router.push('/home')}
              aria-label="กลับหน้าหลัก"
            >
              <AhaIcon name="arrow" size={21} />
            </button>

            <div className="brand-mark">
              <AhaIcon name="pill" />
            </div>
            <span><T>การเตือนยา</T></span>
          </div>

          <button className="btn btn-primary" onClick={openNew}>
            <AhaIcon name="plus" /><T>เพิ่มการเตือน</T></button>
        </header>

        {error && (
          <div className="error" style={{ marginBottom: 14 }}>
            {error}
          </div>
        )}

        {success && (
          <div className="success" style={{ marginBottom: 14 }}>
            {success}
          </div>
        )}

        <section className="hero">
          <div className="hero-content">
            <div className="eyebrow">MEDICATION TIMELINE</div>
            <h1><T>จัดการการเตือนแบบเข้าใจง่าย</T></h1>
            <p><T>ตั้งเวลา เปิด–ปิด แก้ไข และลบรายการยาได้จากหน้าเดียว</T></p>
          </div>
        </section>

        <section className="card" style={{ marginTop: 18 }}>
          <div className="card-head">
            <div>
              <div className="section-title"><T>รายการทั้งหมด</T></div>
              <div className="muted small">
                {items.filter((item) => item.is_active !== false).length}{' '}<T>รายการกำลังใช้งาน</T></div>
            </div>

            <button className="btn btn-soft" onClick={load}>
              <AhaIcon name="activity" /><T>รีเฟรช</T></button>
          </div>

          {loading ? (
            <div className="empty"><T>กำลังโหลดรายการ…</T></div>
          ) : sorted.length === 0 ? (
            <div className="empty">
              <AhaIcon name="pill" size={34} />
              <div style={{ marginTop: 10, fontWeight: 500 }}><T>ยังไม่มีการเตือน</T></div>
              <div><T>เพิ่มรายการยาแรกเพื่อเริ่มต้นใช้งาน AHA</T></div>
              <button
                className="btn btn-primary"
                style={{ marginTop: 14 }}
                onClick={openNew}
              >
                <AhaIcon name="plus" /><T>เพิ่มรายการ</T></button>
            </div>
          ) : (
            <div className="grid">
              {sorted.map((item) => (
                <article className="reminder-card" key={item.id}>
                  <div className="pill-icon">
                    <AhaIcon name="pill" />
                  </div>

                  <div>
                    <div className="reminder-time">
                      {String(item.reminder_time || '').slice(0, 5)}<T>น.</T></div>
                    <div style={{ fontSize: 18 }}>
                      {item.medicine_name}
                    </div>
                    <div className="muted small">
                      {item.dosage || 'ไม่ได้ระบุขนาดยา'} ·{' '}
                      <T>{item.frequency === 'weekly' ? 'รายสัปดาห์' : 'ทุกวัน'}</T> ·{' '}
                      <T>{item.is_active !== false ? 'กำลังใช้งาน' : 'ปิดอยู่'}</T>
                    </div>
                  </div>

                  <div className="actions">
                    <button
                      className={
                        'switch ' + (item.is_active !== false ? 'on' : '')
                      }
                      onClick={() => toggle(item)}
                      aria-label="เปิดหรือปิดการเตือน"
                    >
                      <span />
                    </button>

                    <button
                      className="btn btn-soft"
                      onClick={() => openEdit(item)}
                    >
                      <AhaIcon name="edit" size={17} /><T>แก้ไข</T></button>

                    <button
                      className="btn btn-danger"
                      onClick={() => remove(item)}
                      aria-label="ลบการเตือน"
                    >
                      <AhaIcon name="trash" size={17} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <nav className="footer-nav">
          <div className="footer-nav-inner">
            <button
              className="footer-link"
              onClick={() => router.push('/home')}
            >
              <AhaIcon name="home" size={20} />
              <span><T>หน้าหลัก</T></span>
            </button>

            <button className="footer-link active">
              <AhaIcon name="pill" size={20} />
              <span><T>ยา</T></span>
            </button>

            <button
              className="footer-link"
              onClick={() => router.push('/notifications')}
            >
              <AhaIcon name="bell" size={20} />
              <span><T>แจ้งเตือน</T></span>
            </button>

            <button
              className="footer-link"
              onClick={() => router.push('/emergency')}
            >
              <AhaIcon name="warning" size={20} />
              <span><T>ฉุกเฉิน</T></span>
            </button>
          </div>
        </nav>

        {open && (
          <div className="modal-backdrop">
            <div className="modal-card">
              <div className="card-head">
                <div>
                  <div className="section-title">
                    <T>{editing ? 'แก้ไขการเตือน' : 'เพิ่มการเตือน'}</T>
                  </div>
                  <div className="muted small"><T>กรอกข้อมูลที่ผู้สูงอายุอ่านได้ง่าย</T></div>
                </div>

                <button
                  className="icon-btn"
                  onClick={() => setOpen(false)}
                  aria-label="ปิด"
                >
                  ×
                </button>
              </div>

              <form onSubmit={save} className="grid">
                <div className="form-grid">
                  <div className="field">
                    <label><T>ชื่อยา *</T></label>
                    <input
                      value={form.medicine_name}
                      onChange={(event) =>
                        update('medicine_name', event.target.value)
                      }
                      placeholder="เช่น ยาความดัน"
                      autoFocus
                    />
                  </div>

                  <div className="field">
                    <label><T>ขนาดยา</T></label>
                    <input
                      value={form.dosage || ''}
                      onChange={(event) =>
                        update('dosage', event.target.value)
                      }
                      placeholder="เช่น 1 เม็ด"
                    />
                  </div>

                  <div className="field">
                    <label><T>เวลา *</T></label>
                    <input
                      type="time"
                      value={form.reminder_time}
                      onChange={(event) =>
                        update('reminder_time', event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="field">
                    <label><T>ความถี่</T></label>
                    <select
                      value={form.frequency}
                      onChange={(event) =>
                        update('frequency', event.target.value)
                      }
                    >
                      <option value="daily"><T>ทุกวัน</T></option>
                      <option value="weekly"><T>รายสัปดาห์</T></option>
                    </select>
                  </div>

                  <div className="field">
                    <label><T>วันที่เริ่ม</T></label>
                    <input
                      type="date"
                      value={form.start_date || ''}
                      onChange={(event) =>
                        update('start_date', event.target.value)
                      }
                    />
                  </div>

                  <div className="field">
                    <label><T>วันที่สิ้นสุด</T></label>
                    <input
                      type="date"
                      value={form.end_date || ''}
                      onChange={(event) =>
                        update('end_date', event.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="field">
                  <label><T>วันที่ต้องเตือน</T></label>
                  <div className="checkbox-grid">
                    {days.map(([day, label]) => (
                      <button
                        type="button"
                        className={
                          'check-chip ' +
                          (form.days_of_week.includes(day) ? 'active' : '')
                        }
                        key={day}
                        onClick={() => toggleDay(day)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="switch-row">
                  <div>
                    <b><T>เปิดใช้งานทันที</T></b>
                    <div className="muted small"><T>ระบบจะติดตามรายการนี้ตามเวลาที่ตั้ง</T></div>
                  </div>

                  <button
                    type="button"
                    className={'switch ' + (form.is_active ? 'on' : '')}
                    onClick={() => update('is_active', !form.is_active)}
                  >
                    <span />
                  </button>
                </div>

                {error && <div className="error">{error}</div>}

                <div className="auth-actions">
                  <button
                    type="button"
                    className="btn btn-soft full"
                    onClick={() => setOpen(false)}
                  ><T>ยกเลิก</T></button>

                  <button
                    className="btn btn-primary full"
                    disabled={saving}
                  >
                    <T>{saving
                      ? 'กำลังบันทึก…'
                      : editing
                        ? 'บันทึกการแก้ไข'
                        : 'สร้างการเตือน'}</T>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

