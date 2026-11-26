'use client';

import { T } from '../../components/Language';
import Link from 'next/link';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AhaIcon from '../../components/AhaIcon';
import { CaregiverEnhancementPanel } from '../../components/AhaCaregiverEnhancements';
import { authApi, caregiverApi, familyApi } from '../../services/api';
import { saveSession } from '../../services/auth';
import './family-dashboard.css';

const EMPTY_FORM = {
  medicine_name: '', dosage: '', reminder_time: '', frequency: 'daily',
  days_of_week: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'],
  start_date: '', end_date: '', is_active: true,
};

function listOf(response) { return Array.isArray(response?.data) ? response.data : []; }
function timeOf(value) { return String(value || '').slice(0, 5); }
function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function shortDate(value) { const s = String(value || '').slice(5, 10); return s ? `${s.slice(3,5)}/${s.slice(0,2)}` : ''; }

function HistoryChart({ rows }) {
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const chart = useMemo(() => {
    const map = new Map();
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      map.set(dateKey(d), { date: dateKey(d), taken: 0, total: 0 });
    }
    rows.forEach((row) => {
      const key = String(row.scheduled_date || '').slice(0, 10);
      if (!map.has(key)) return;
      const item = map.get(key);
      item.total += 1;
      if (row.status === 'taken') item.taken += 1;
    });
    const points = Array.from(map.values());
    const max = Math.max(1, ...points.map((p) => p.total));
    const width = 760, height = 270, left = 42, right = 18, top = 28, bottom = 48;
    const innerW = width - left - right, innerH = height - top - bottom;
    const x = (i) => left + (points.length === 1 ? innerW / 2 : (innerW * i) / (points.length - 1));
    const y = (v) => top + innerH - (innerH * v) / max;
    return { points, max, width, height, x, y, baseline: top + innerH, unit: innerH / max };
  }, [rows]);

  const selectedPoint = chart.points.find((point) => point.date === selectedDate) || chart.points[chart.points.length - 1];
  const selectPoint = (point) => setSelectedDate(point.date);

  return (
    <section className="family-chart-card">
      <div className="section-heading chart-heading">
        <div><span className="aha-family-eyebrow">7 DAYS</span><h3><T>ภาพรวมการทานยา 7 วัน</T></h3><p><T>แตะแท่งกราฟเพื่อดูรายละเอียดของแต่ละวัน</T></p></div>
        <div className="chart-legend"><span><i className="legend-taken" /><T>ทานแล้ว</T></span><span><i className="legend-waiting" /><T>ยังไม่ยืนยัน</T></span></div>
      </div>
      {rows.length === 0 && <div className="chart-empty compact"><T>ยังไม่มีประวัติการทานยา กราฟจะแสดงข้อมูลเมื่อระบบเริ่มบันทึกรายการ</T></div>}
      <div className="chart-wrap">
          <svg viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label="กราฟแท่งสรุปการทานยา 7 วัน">
            {[0, .5, 1].map((ratio) => <line key={ratio} x1="42" x2="742" y1={chart.y(chart.max * ratio)} y2={chart.y(chart.max * ratio)} className="chart-grid" />)}
            {chart.points.map((p, i) => (
              <g key={p.date} className={`chart-point ${selectedPoint.date === p.date ? 'selected' : ''}`} role="button" tabIndex="0" aria-label={`${shortDate(p.date)} ทานแล้ว ${p.taken} จาก ${p.total} รายการ`} onClick={() => selectPoint(p)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectPoint(p); } }}>
                <title>{`${shortDate(p.date)}: ทานแล้ว ${p.taken} จาก ${p.total} รายการ`}</title>
                <rect className="chart-hit-area" x={chart.x(i) - 36} y="8" width="72" height="242" rx="12" />
                {selectedPoint.date === p.date && <rect className="chart-bar-selected" x={chart.x(i) - 27} y="18" width="54" height="214" rx="12" />}
                {p.total === 0 ? <rect className="chart-bar-empty" x={chart.x(i) - 18} y={chart.baseline - 4} width="36" height="4" rx="2" /> : <>
                  <rect className="chart-bar-waiting" x={chart.x(i) - 18} y={chart.baseline - (p.total * chart.unit)} width="36" height={(p.total - p.taken) * chart.unit} rx="8" />
                  <rect className="chart-bar-taken" x={chart.x(i) - 18} y={chart.baseline - (p.taken * chart.unit)} width="36" height={p.taken * chart.unit} rx="8" />
                  <text x={chart.x(i)} y={Math.max(18, chart.baseline - (p.total * chart.unit) - 7)} textAnchor="middle" className="chart-value">{p.taken}/{p.total}</text>
                </>}
                <text x={chart.x(i)} y="250" textAnchor="middle" className="chart-label">{shortDate(p.date)}</text>
              </g>
            ))}
          </svg>
      </div>
      <div className="chart-selection" aria-live="polite"><div><span><T>วันที่</T>{shortDate(selectedPoint.date)}</span><strong>{selectedPoint.taken} / {selectedPoint.total}<T>รายการ</T></strong></div><small>{selectedPoint.total === 0 ? 'ยังไม่มีรายการที่บันทึกในวันนี้' : selectedPoint.taken === selectedPoint.total ? 'ทานยาครบแล้ว' : `เหลือ ${selectedPoint.total - selectedPoint.taken} รายการที่ยังไม่ได้ยืนยัน`}</small></div>
    </section>
  );
}

export default function FamilyPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [connections, setConnections] = useState([]);
  const [linkedElderly, setLinkedElderly] = useState([]);
  const [dashboard, setDashboard] = useState({ elderly: [], today: [], history: [] });
  const [selectedElderly, setSelectedElderly] = useState('');
  const [phone, setPhone] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [connectionToRemove, setConnectionToRemove] = useState(null);
  const isCaregiver = user?.role === 'caregiver';

  const load = useCallback(async () => {
    setError('');
    try {
      const [connectionResponse, elderlyResponse] = await Promise.all([familyApi.connections(), familyApi.linkedElderly()]);
      setConnections(listOf(connectionResponse));
      const elderly = listOf(elderlyResponse);
      setLinkedElderly(elderly);
      setSelectedElderly((current) => elderly.some((person) => String(person.user_id) === String(current)) ? current : elderly[0]?.user_id || '');
      if (isCaregiver) {
        const summary = await caregiverApi.summary();
        setDashboard(summary?.data || { elderly: [], today: [], history: [] });
      }
    } catch (err) { setError(err.message || 'ยังโหลดข้อมูลครอบครัวไม่ได้'); }
    finally { setLoading(false); }
  }, [isCaregiver]);

  useEffect(() => {
    let active = true;
    authApi.me().then((result) => {
      if (!active) return;
      if (!result?.user) {
        router.replace('/login');
        return;
      }
      saveSession({ user: result.user });
      setUser(result.user);
    }).catch(() => { if (active) router.replace('/login'); });
    return () => { active = false; };
  }, [router]);
  useEffect(() => { if (user) load(); }, [user, load]);
  useEffect(() => {
    if (!user) return undefined;
    window.addEventListener('aha-reminders-refresh', load);
    return () => window.removeEventListener('aha-reminders-refresh', load);
  }, [user, load]);
  useEffect(() => {
    if (!connectionToRemove) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape' && !busy) setConnectionToRemove(null); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [connectionToRemove, busy]);

  const incoming = useMemo(() => connections.filter((item) => item.status === 'pending' && item.direction === 'incoming'), [connections]);
  const outgoing = useMemo(() => connections.filter((item) => item.status === 'pending' && item.direction === 'outgoing'), [connections]);
  const accepted = useMemo(() => connections.filter((item) => item.status === 'accepted'), [connections]);
  const selectedPerson = dashboard.elderly.find((person) => String(person.user_id) === String(selectedElderly)) || linkedElderly.find((person) => String(person.user_id) === String(selectedElderly));
  const selectedToday = dashboard.today.filter((item) => String(item.user_id) === String(selectedElderly));
  const selectedHistory = dashboard.history.filter((item) => String(item.user_id) === String(selectedElderly));

  const stats = useMemo(() => {
    const total = selectedToday.length;
    const taken = selectedToday.filter((item) => item.taken).length;
    const overdue = selectedToday.filter((item) => !item.taken && new Date(`1970-01-01T${timeOf(item.reminder_time)}:00`) < new Date(`1970-01-01T${new Date().toTimeString().slice(0,5)}:00`)).length;
    return { total, taken, overdue, rate: total ? Math.round((taken / total) * 100) : 0 };
  }, [selectedToday]);

  const submitConnect = async (event) => {
    event.preventDefault(); setError(''); setSuccess('');
    const normalized = phone.replace(/\D/g, '');
    if (!/^0\d{9}$/.test(normalized)) { setError('กรุณากรอกเบอร์โทร 10 หลัก'); return; }
    setBusy(true);
    try { await familyApi.connect(normalized); setPhone(''); setSuccess('ส่งคำขอเชื่อมต่อแล้ว รออีกฝ่ายยืนยัน'); await load(); }
    catch (err) { setError(err.message || 'ส่งคำขอเชื่อมต่อไม่สำเร็จ'); await load(); }
    finally { setBusy(false); }
  };

  const respond = async (id, status) => {
    setError(''); setSuccess(''); setBusy(true);
    try { await familyApi.updateConnection(id, status); setSuccess(status === 'accepted' ? 'เชื่อมต่อสำเร็จแล้ว' : 'ปฏิเสธคำขอแล้ว'); await load(); }
    catch (err) { setError(err.message || 'ดำเนินการกับคำขอไม่สำเร็จ'); }
    finally { setBusy(false); }
  };

  const confirmRemoveConnection = async () => {
    if (!connectionToRemove) return;
    setError(''); setSuccess(''); setBusy(true);
    try {
      await familyApi.deleteConnection(connectionToRemove.id);
      setConnectionToRemove(null);
      setSuccess(connectionToRemove.status === 'pending' ? 'ยกเลิกคำขอเชื่อมต่อแล้ว' : 'ยกเลิกการเชื่อมต่อแล้ว');
      await load();
    } catch (err) { setError(err.message || 'ยกเลิกการเชื่อมต่อไม่สำเร็จ'); }
    finally { setBusy(false); }
  };

  const resetForm = () => { setForm(EMPTY_FORM); setEditingId(null); setEditorOpen(false); };
  const refreshSummary = async () => { const summary = await caregiverApi.summary(); setDashboard(summary?.data || { elderly: [], today: [], history: [] }); };

  const submitReminder = async (event) => {
    event.preventDefault();
    if (!selectedElderly) { setError('กรุณาเลือกผู้สูงอายุ'); return; }
    setError(''); setSuccess(''); setBusy(true);
    try {
      if (editingId) await caregiverApi.updateReminder(editingId, form);
      else await caregiverApi.createReminder({ ...form, elderly_user_id: selectedElderly });
      resetForm(); setSuccess(editingId ? 'แก้ไขยาแล้ว และส่งแจ้งเตือนไปยังผู้สูงอายุแล้ว' : 'เพิ่มยาแล้ว และส่งแจ้งเตือนไปยังผู้สูงอายุแล้ว'); await refreshSummary();
    } catch (err) { setError(err.message || 'บันทึกตารางยาไม่สำเร็จ'); }
    finally { setBusy(false); }
  };

  const startEdit = (item) => {
    setEditingId(item.reminder_id);
    setEditorOpen(true);
    setForm({ medicine_name:item.medicine_name || '', dosage:item.dosage || '', reminder_time:timeOf(item.reminder_time), frequency:item.frequency || 'daily', days_of_week:item.days_of_week || EMPTY_FORM.days_of_week, start_date:String(item.start_date || '').slice(0,10), end_date:String(item.end_date || '').slice(0,10), is_active:item.is_active !== false });
    window.setTimeout(() => document.getElementById('med-editor')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  };
  const removeReminder = async (item) => {
    if (!window.confirm(`ลบยา ${item.medicine_name} เวลา ${timeOf(item.reminder_time)} หรือไม่?\nผู้สูงอายุจะได้รับการแจ้งเตือน`)) return;
    setBusy(true); setError(''); setSuccess('');
    try { await caregiverApi.removeReminder(item.reminder_id); setSuccess('ลบรายการยาแล้ว และแจ้งผู้สูงอายุแล้ว'); await refreshSummary(); }
    catch (err) { setError(err.message || 'ลบรายการยาไม่สำเร็จ'); }
    finally { setBusy(false); }
  };

  if (!user) {
    return (
      <main className="aha-family-auth-check" role="status" aria-live="polite">
        <span className="aha-family-auth-spinner" aria-hidden="true"/>
        <strong><T>กำลังตรวจสอบการเข้าสู่ระบบ</T></strong>
        <small><T>กรุณารอสักครู่…</T></small>
        <style jsx>{`
          .aha-family-auth-check{min-height:100vh;display:grid;place-content:center;justify-items:center;gap:10px;background:#f5f8f8;color:#20343c;font-family:var(--font-prompt),"Prompt",sans-serif}
          .aha-family-auth-spinner{width:36px;height:36px;border:4px solid #dce9ec;border-top-color:#2085b1;border-radius:50%;animation:spin .8s linear infinite}
          .aha-family-auth-check strong{font-size:17px}
          .aha-family-auth-check small{color:#71858c}
          @keyframes spin{to{transform:rotate(360deg)}}
        `}</style>
      </main>
    );
  }

  return (
    <div className="aha-v3-page aha-family-page aha-layout-refresh">
      <main className="aha-family-shell">
        <header className="aha-family-header">
          <button className="aha-family-back" onClick={() => router.push('/home')} aria-label="กลับหน้าหลัก"><AhaIcon name="arrow" size={22} /></button>
          <div><span className="aha-family-eyebrow family-brand"><i aria-hidden="true">♥</i>AHA FAMILY</span><h1><T>{isCaregiver ? 'ศูนย์ดูแลผู้สูงอายุ' : 'เชื่อมต่อกับผู้ดูแล'}</T></h1><p><T>{isCaregiver ? 'ติดตามยาและสถานะของผู้สูงอายุที่คุณดูแลจากที่เดียว' : 'ให้ผู้ดูแลที่ไว้ใจได้ช่วยติดตามการดูแลของคุณ'}</T></p></div>
        </header>
        {(error || success) && <div className={`aha-family-alert ${error ? 'error' : 'success'}`}>{error || success}</div>}

        {isCaregiver && <section className="caregiver-focus">
          <div className="caregiver-focus-head"><div><span className="aha-family-eyebrow">CAREGIVER DASHBOARD</span><h2><T>ภาพรวมการดูแล</T></h2></div><span className="caregiver-count">{linkedElderly.length}<T>คน</T></span></div>
          {loading ? <div className="aha-family-empty"><T>กำลังโหลดข้อมูล…</T></div> : linkedElderly.length === 0 ? <div className="aha-family-empty"><T>ยังไม่มีผู้สูงอายุที่เชื่อมต่อ</T></div> : <>
            <p><Link href="/family/reports" style={{color:'inherit',textDecoration:'underline',textUnderlineOffset:'3px'}}>รายงานผู้ดูแลรายสัปดาห์และตั้งค่ารับอีเมล →</Link></p>
            <div className="elderly-selector">{linkedElderly.map((person) => <button key={person.user_id} className={String(selectedElderly) === String(person.user_id) ? 'active' : ''} onClick={() => setSelectedElderly(person.user_id)}><span className="elderly-avatar">{(person.name || '?').slice(0,1)}</span><span><strong>{person.name || 'ผู้สูงอายุ'}</strong><small>{person.phone}</small></span></button>)}</div>
            {selectedPerson && <div className="elderly-overview"><div className="elderly-overview-title"><div><h3>{selectedPerson.name || 'ผู้สูงอายุ'}</h3><p><T>สถานะวันนี้ · ติดตามการทานยา</T></p></div><span className="care-status"><T>กำลังดูแล</T></span></div><div className="caregiver-stats"><div><strong>{stats.total}</strong><span><T>รายการยาวันนี้</T></span></div><div><strong>{stats.taken}</strong><span><T>ทานแล้ว</T></span></div><div className={stats.overdue ? 'warning' : ''}><strong>{stats.overdue}</strong><span><T>ยังไม่ได้ยืนยัน</T></span></div><div><strong>{stats.rate}%</strong><span><T>อัตราทานยาวันนี้</T></span></div></div></div>}
            <div className="medication-section"><div className="section-heading"><div><h3><T>ตารางยาของวันนี้</T></h3><p><T>ดูสถานะการทานยาแบบล่าสุด</T></p></div></div>{selectedToday.length === 0 ? <div className="aha-family-empty"><T>วันนี้ยังไม่มีรายการยา</T></div> : selectedToday.map((item) => <article className="medication-row" key={item.reminder_id}><div className="med-time">{timeOf(item.reminder_time)}</div><div className="med-main"><strong>{item.medicine_name}</strong><span>{item.dosage || 'ไม่ได้ระบุขนาดยา'}</span></div><span className={`med-state ${item.taken ? 'taken' : 'waiting'}`}><T>{item.taken ? 'ทานแล้ว' : 'รอยืนยัน'}</T></span><div className="med-actions"><button onClick={() => startEdit(item)} disabled={busy}><T>แก้ไข</T></button><button className="danger" onClick={() => removeReminder(item)} disabled={busy}><T>ลบ</T></button></div></article>)}</div>
            <div className="medication-manage-bar"><div><h3><T>จัดการยา</T></h3><p><T>เพิ่มรายการใหม่หรือแก้ไขตารางยาของผู้สูงอายุ</T></p></div><button type="button" className="open-med-editor" onClick={() => { resetForm(); setEditorOpen(true); }}><T>+ เพิ่มยา</T></button></div>
            {editorOpen && <form id="med-editor" className="med-editor" onSubmit={submitReminder}><div className="section-heading"><div><h3><T>{editingId ? 'แก้ไขตารางยา' : 'เพิ่มยาให้ผู้สูงอายุ'}</T></h3><p><T>ข้อมูลจะถูกบันทึกผ่าน Reminder Service ของ AHA</T></p></div><button type="button" className="cancel-edit" onClick={resetForm}><T>ยกเลิก</T></button></div><div className="editor-grid"><label><T>ชื่อยา</T><input value={form.medicine_name} onChange={(e) => setForm({ ...form, medicine_name:e.target.value })} placeholder="เช่น วิตามินซี" required /></label><label><T>ขนาดยา</T><input value={form.dosage} onChange={(e) => setForm({ ...form, dosage:e.target.value })} placeholder="เช่น 1 เม็ด" /></label><label><T>เวลา</T><input type="time" value={form.reminder_time} onChange={(e) => setForm({ ...form, reminder_time:e.target.value })} required /></label><label><T>ความถี่</T><select value={form.frequency} onChange={(e) => setForm({ ...form, frequency:e.target.value })}><option value="daily"><T>ทุกวัน</T></option><option value="weekly"><T>รายสัปดาห์</T></option></select></label></div><button className="save-med" disabled={busy}><T>{busy ? 'กำลังบันทึก…' : editingId ? 'บันทึกการแก้ไข + แจ้งผู้สูงอายุ' : 'เพิ่มยา + แจ้งผู้สูงอายุ'}</T></button></form>}
          </>}
            {!loading && linkedElderly.length > 0 && <HistoryChart rows={selectedHistory} />}
        </section>}
        {isCaregiver && <CaregiverEnhancementPanel rows={selectedHistory} />}

        <section className="aha-family-connect-card"><div className="aha-family-card-icon"><AhaIcon name="users" size={32} /></div><div className="aha-family-card-copy"><h2><T>{isCaregiver ? 'เพิ่มผู้สูงอายุที่คุณดูแล' : 'เพิ่มผู้ดูแลของคุณ'}</T></h2><p><T>กรอกเบอร์โทรศัพท์ที่อีกฝ่ายใช้สมัคร AHA แล้วส่งคำขอเชื่อมต่อ</T></p><form onSubmit={submitConnect} className="aha-family-connect-form"><input value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" type="tel" placeholder="0XXXXXXXXX" aria-label="เบอร์โทรศัพท์" maxLength={10} /><button type="submit" disabled={busy}><T>ส่งคำขอ</T></button></form></div></section>

        {incoming.length > 0 && <section className="aha-family-section"><div className="aha-family-section-title"><h2><T>คำขอที่รอคุณยืนยัน</T></h2><span>{incoming.length}</span></div>{incoming.map((item) => <article className="aha-family-person-card pending" key={item.id}><div className="aha-family-avatar">{(item.name || '?').slice(0,1)}</div><div className="aha-family-person-main"><strong>{item.name || 'ผู้ใช้ AHA'}</strong><span>{item.phone} · <T>{item.role === 'caregiver' ? 'ผู้ดูแล' : 'ผู้สูงอายุ'}</T></span><small><T>ต้องการเชื่อมต่อกับคุณ</T></small></div><div className="aha-family-actions"><button className="primary" onClick={() => respond(item.id, 'accepted')} disabled={busy}><T>ยอมรับ</T></button><button className="secondary" onClick={() => respond(item.id, 'rejected')} disabled={busy}><T>ปฏิเสธ</T></button></div></article>)}</section>}
        {outgoing.length > 0 && <section className="aha-family-section"><div className="aha-family-section-title"><h2><T>คำขอที่ส่งไป</T></h2><span>{outgoing.length}</span></div>{outgoing.map((item) => <article className="aha-family-person-card outgoing" key={item.id}><div className="aha-family-avatar">{(item.name || '?').slice(0,1)}</div><div className="aha-family-person-main"><strong>{item.name || 'ผู้ใช้ AHA'}</strong><span>{item.phone} · <T>{item.role === 'caregiver' ? 'ผู้ดูแล' : 'ผู้สูงอายุ'}</T></span><small><T>รอการยืนยันจากอีกฝ่าย</T></small></div><div className="aha-family-outgoing-actions"><span className="aha-family-status waiting"><T>รอการยืนยัน</T></span><button type="button" className="aha-family-remove-button" onClick={() => setConnectionToRemove(item)} disabled={busy}><T>ยกเลิกคำขอ</T></button></div></article>)}</section>}
        <section className="aha-family-section"><div className="aha-family-section-title"><h2><T>เชื่อมต่อแล้ว</T></h2><span>{accepted.length}</span></div>{accepted.length === 0 ? <div className="aha-family-empty"><T>ยังไม่มีบัญชีที่เชื่อมต่อกัน</T></div> : accepted.map((item) => <article className="aha-family-person-card connected" key={item.id}><div className="aha-family-avatar">{(item.name || '?').slice(0,1)}</div><div className="aha-family-person-main"><strong>{item.name || 'ผู้ใช้ AHA'}</strong><span>{item.phone} · <T>{item.role === 'caregiver' ? 'ผู้ดูแล' : 'ผู้สูงอายุ'}</T></span><small><T>{isCaregiver && item.role === 'elderly' ? 'พร้อมติดตามยาและสถานะการทานยา' : 'เชื่อมต่อแล้ว'}</T></small></div><span className="aha-family-status connected"><T>เชื่อมต่อแล้ว</T></span><button type="button" className="aha-family-remove-button" onClick={() => setConnectionToRemove(item)} disabled={busy}><T>ยกเลิกการเชื่อมต่อ</T></button></article>)}</section>
      </main>

      {connectionToRemove && <div className="aha-family-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setConnectionToRemove(null); }}>
        <section className="aha-family-modal" role="dialog" aria-modal="true" aria-labelledby="remove-connection-title" aria-describedby="remove-connection-description">
          <div className="aha-family-modal-icon" aria-hidden="true">!</div>
          <h2 id="remove-connection-title"><T>ต้องการลบจริงหรือไม่?</T></h2>
          <p id="remove-connection-description">{connectionToRemove.status === 'pending' ? `คำขอที่ส่งถึง ${connectionToRemove.name || 'ผู้ใช้ AHA'} จะถูกยกเลิก` : `คุณและ ${connectionToRemove.name || 'ผู้ใช้ AHA'} จะไม่สามารถติดตามข้อมูลการดูแลของกันและกันได้`}</p>
          <div className="aha-family-modal-actions">
            <button type="button" className="cancel" onClick={() => setConnectionToRemove(null)} disabled={busy} autoFocus><T>กลับไปก่อน</T></button>
            <button type="button" className="confirm" onClick={confirmRemoveConnection} disabled={busy}><T>{busy ? 'กำลังลบ…' : 'ยืนยัน'}</T></button>
          </div>
        </section>
      </div>}

    </div>
  );
}

