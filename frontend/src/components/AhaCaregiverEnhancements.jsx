'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import AhaIcon from './AhaIcon';

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function CaregiverCalendar({ rows = [] }) {
  const today = useMemo(() => new Date(), []);
  const todayKey = localDateKey(today);
  const [open,setOpen]=useState(true);
  const [cursor,setCursor]=useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedKey,setSelectedKey]=useState(todayKey);
  const activity = useMemo(() => rows.reduce((map, row) => {
    const key = String(row.scheduled_date || '').slice(0, 10);
    if (!key) return map;
    const current = map.get(key) || { total: 0, taken: 0 };
    current.total += 1;
    if (row.status === 'taken') current.taken += 1;
    map.set(key, current);
    return map;
  }, new Map()), [rows]);
  const days = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const count = new Date(year, month + 1, 0).getDate();
    const offset = (first.getDay() + 6) % 7;
    return [...Array(offset).fill(null), ...Array.from({ length: count }, (_, index) => {
      const date = new Date(year, month, index + 1);
      return { day: index + 1, key: localDateKey(date) };
    })];
  }, [cursor]);
  const month = cursor.toLocaleDateString('th-TH',{month:'long',year:'numeric'});
  const selected = activity.get(selectedKey) || { total: 0, taken: 0 };
  const moveMonth = (amount) => setCursor((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  const goToday = () => { setCursor(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedKey(todayKey); };
  return <section className={`aha-care-calendar ${open?'is-open':'is-collapsed'}`} aria-label="ปฏิทินการดูแล"><div className="aha-care-calendar-head"><div><span>ตารางการดูแล</span><h2>ปฏิทินการดูแล</h2><p>เลือกวันที่เพื่อดูประวัติการติดตามยา</p></div><div className="aha-care-calendar-actions"><button type="button" className="aha-care-calendar-today" onClick={goToday}><AhaIcon name="calendar" size={18}/><b>{today.getDate()}</b><small>วันนี้</small></button><button type="button" className="aha-care-calendar-toggle" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>{open?'ซ่อน':'แสดง'}</button></div></div>{open&&<div className="aha-care-calendar-body"><div className="aha-care-calendar-month"><button type="button" onClick={() => moveMonth(-1)} aria-label="เดือนก่อนหน้า"><AhaIcon name="chevron" size={18}/></button><strong>{month}</strong><button type="button" onClick={() => moveMonth(1)} aria-label="เดือนถัดไป"><AhaIcon name="chevron" size={18}/></button></div><div className="aha-care-calendar-grid aha-care-week"><b>จ</b><b>อ</b><b>พ</b><b>พฤ</b><b>ศ</b><b>ส</b><b>อา</b></div><div className="aha-care-calendar-grid">{days.map((item,index)=>item?<button type="button" key={item.key} onClick={() => setSelectedKey(item.key)} className={`${item.key===todayKey?'today ':''}${item.key===selectedKey?'selected ':''}${activity.has(item.key)?'has-activity ':''}${activity.get(item.key)?.total > 0 && activity.get(item.key)?.taken === activity.get(item.key)?.total?'complete':''}`} aria-pressed={item.key===selectedKey} aria-label={`วันที่ ${item.day}${activity.has(item.key) ? ` มี ${activity.get(item.key).total} รายการ` : ''}`}><span>{item.day}</span>{activity.has(item.key)&&<i/>}</button>:<span className="empty-day" key={`empty-${index}`}/>)}</div><div className="aha-care-calendar-selection" aria-live="polite"><div><span>วันที่เลือก</span><strong>{selectedKey.split('-').reverse().join('/')}</strong></div><p>{selected.total === 0 ? 'ยังไม่มีข้อมูลการติดตามยาในวันนี้' : `ทานแล้ว ${selected.taken} จาก ${selected.total} รายการ`}</p></div><div className="aha-care-calendar-legend"><span><i className="dot-blue"/>วันนี้</span><span><i className="dot-orange"/>มีรายการติดตาม</span><span><i className="dot-green"/>ทานครบแล้ว</span></div></div>}</section>;
}

export function CaregiverEnhancementPanel({ rows = [] }){
  return <div className="aha-care-enhancements"><CaregiverCalendar rows={rows}/></div>;
}

export default function AhaCaregiverEnhancements(){
  usePathname();
  return <><style jsx global>{`
    .aha-care-enhancements{width:min(1120px,calc(100% - 40px));margin:18px auto;display:flex;flex-direction:column;gap:14px}
    .aha-care-showcase{width:100%;margin:0;padding:24px 26px;border-radius:22px;background:#fff;color:#203247;position:relative;overflow:hidden;border:1px solid #dce5ec;box-shadow:0 8px 24px rgba(31,72,64,.07)}
    .aha-care-showcase:after{content:'';position:absolute;width:220px;height:220px;border-radius:50%;right:-65px;top:-100px;background:rgba(49,91,120,.06);box-shadow:-80px 150px 0 20px rgba(216,169,77,.06)}
    .aha-care-showcase-copy{position:relative;z-index:1;max-width:520px}.aha-care-showcase-copy>span{font-size:10px;color:#315b78}.aha-care-showcase h2{margin:6px 0 8px;font-size:28px;line-height:1.15}.aha-care-showcase h2 em{font-style:normal;color:#203247}.aha-care-showcase p{margin:0;max-width:560px;font-size:13px;line-height:1.6;color:#667789}
    .aha-care-showcase-cards{position:relative;z-index:1;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:20px}.aha-care-showcase-cards div{padding:13px;border-radius:16px;background:#f6f8fa;border:1px solid #e4ebf0}.aha-care-showcase-cards b{display:block;font-size:18px;color:#315b78}.aha-care-showcase-cards strong{display:block;font-size:13px;margin-top:4px}.aha-care-showcase-cards small{display:block;margin-top:3px;font-size:10px;line-height:1.45;color:#748493}
    .aha-care-calendar{width:100%;margin:0;padding:20px;border:1px solid #dce6ed;border-radius:22px;background:#fff;box-shadow:0 8px 24px rgba(31,72,64,.07);color:#1f342f}.aha-care-calendar-head{display:flex;justify-content:space-between;align-items:center;gap:16px}.aha-care-calendar-head>div:first-child>span{color:#315b78;font-size:10px;}.aha-care-calendar-head h2{margin:3px 0 4px;font-size:22px}.aha-care-calendar-head p{margin:0;color:#6e7e8c;font-size:13px}.aha-care-calendar-actions{display:flex;align-items:center;gap:9px}.aha-care-calendar-badge{width:58px;height:62px;flex:0 0 58px;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:16px;background:#eef4f8;color:#315b78}.aha-care-calendar-badge b{font-size:20px;line-height:1}.aha-care-calendar-badge small{font-size:9px;color:#6f807b;margin-top:3px}.aha-care-calendar-toggle{min-width:62px;height:38px;border:1px solid #d4e0e8;border-radius:11px;background:#f4f7f9;color:#294f69;cursor:pointer}.aha-care-calendar-toggle:hover{background:#eef4f8}.aha-care-calendar-body{margin-top:2px}.aha-care-calendar-month{display:flex;justify-content:space-between;align-items:center;margin:16px 0 10px;padding:9px 12px;border-radius:14px;background:#f2f6f9}.aha-care-calendar-month strong{font-size:15px}.aha-care-calendar-month span{font-size:10px;color:#6e7e8c}.aha-care-calendar-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:5px}.aha-care-calendar-grid span,.aha-care-week b{min-height:38px;display:grid;place-items:center;border-radius:11px;font-size:13px}.aha-care-week b{min-height:30px;color:#85939e;font-size:10px}.aha-care-calendar-grid span{background:#fff;border:1px solid #e7edf2}.aha-care-calendar-grid span:empty{background:transparent;border-color:transparent}.aha-care-calendar-grid span.today{background:#315b78;color:#fff;border-color:#315b78;box-shadow:0 5px 12px rgba(49,91,120,.20)}.aha-care-calendar-legend{display:flex;flex-wrap:wrap;gap:12px;margin-top:14px;color:#6d7d8a;font-size:10px}.aha-care-calendar-legend i{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px}.dot-blue{background:#315b78}.dot-orange{background:#d8a94d}.aha-care-calendar.is-collapsed{padding-top:15px;padding-bottom:15px}
    button[aria-label^="กลับ"] svg,.aha-family-back svg,.aha-profile-icon-button svg,.aha-page-back svg,.aha-back-button svg,.aha-voice-back svg,.aha-emergency-back svg{transform:rotate(180deg)!important}.aha-v3-top-actions>button:nth-child(2) .aha-v3-user-avatar{background-color:#2f6bff!important;background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important}
    html[data-aha-appearance="dark"] .aha-care-showcase,html[data-aha-appearance="dark"] .aha-care-calendar{background:var(--aha-surface)!important;border-color:var(--aha-border)!important;color:var(--aha-text)!important;box-shadow:none!important}
    html[data-aha-appearance="dark"] .aha-care-showcase h2,html[data-aha-appearance="dark"] .aha-care-calendar h2,html[data-aha-appearance="dark"] .aha-care-showcase-cards strong,html[data-aha-appearance="dark"] .aha-care-calendar-month strong{color:var(--aha-text)!important}
    html[data-aha-appearance="dark"] .aha-care-showcase p,html[data-aha-appearance="dark"] .aha-care-showcase-cards small,html[data-aha-appearance="dark"] .aha-care-calendar-head p,html[data-aha-appearance="dark"] .aha-care-calendar-month span,html[data-aha-appearance="dark"] .aha-care-calendar-legend{color:var(--aha-text-secondary)!important}
    html[data-aha-appearance="dark"] .aha-care-showcase-cards div,html[data-aha-appearance="dark"] .aha-care-calendar-month{background:var(--aha-surface-soft)!important;border-color:var(--aha-border)!important}
    html[data-aha-appearance="dark"] .aha-care-calendar-grid span{background:var(--aha-surface-soft)!important;border-color:var(--aha-border)!important;color:var(--aha-text)!important}
    html[data-aha-appearance="dark"] .aha-care-calendar-grid span.today{background:#315b78!important;color:#fff!important;border-color:#477b9f!important}
    html[data-aha-appearance="dark"] .aha-care-calendar-badge{background:#20313c!important;color:#8fcfff!important}
    html[data-aha-appearance="dark"] .aha-care-calendar-toggle{background:var(--aha-surface-soft)!important;border-color:var(--aha-border)!important;color:var(--aha-text)!important}
    .aha-care-calendar-today{width:64px;height:62px;flex:0 0 64px;border:1px solid #dce6ed;border-radius:16px;background:#eef4f8;color:#315b78;display:grid;grid-template-columns:20px 1fr;grid-template-rows:1fr 14px;align-items:center;justify-items:center;padding:7px 8px;cursor:pointer}.aha-care-calendar-today svg{grid-row:1;grid-column:1}.aha-care-calendar-today b{grid-row:1;grid-column:2;font-size:19px;line-height:1}.aha-care-calendar-today small{grid-row:2;grid-column:1/-1;font-size:9px;color:#566474}.aha-care-calendar-month button{width:36px;height:36px;border:1px solid #d8e3ea;border-radius:10px;background:#fff;color:#315b78;display:grid;place-items:center;cursor:pointer}.aha-care-calendar-month button:first-child svg{transform:rotate(180deg)}.aha-care-calendar-grid>button,.aha-care-calendar-grid>.empty-day{position:relative;min-width:0;min-height:42px;border:1px solid #e2e9ee;border-radius:11px;background:#fff;color:#263849;display:grid;place-items:center;padding:0;cursor:pointer}.aha-care-calendar-grid>.empty-day{border-color:transparent;background:transparent}.aha-care-calendar-grid>button>span{min-height:0!important;border:0!important;background:transparent!important;color:inherit!important;display:block!important;font-size:13px!important}.aha-care-calendar-grid>button.today{background:#315b78;color:#fff;border-color:#315b78;box-shadow:0 5px 12px rgba(49,91,120,.20)}.aha-care-calendar-grid>button.selected{outline:3px solid rgba(47,107,255,.19);outline-offset:1px}.aha-care-calendar-grid>button.has-activity i{position:absolute;bottom:4px;width:6px;height:6px;border-radius:50%;background:#d88b2b}.aha-care-calendar-grid>button.complete i{background:#2f9b76}.aha-care-calendar-grid>button:hover{border-color:#7d9fb5;background:#f3f8fb}.aha-care-calendar-grid>button.today:hover{background:#294f69}.aha-care-calendar-selection{margin-top:13px;padding:11px 13px;border:1px solid #dfe8ed;border-radius:14px;background:#f7fafb;display:flex;align-items:center;justify-content:space-between;gap:12px}.aha-care-calendar-selection div{display:flex;flex-direction:column;gap:2px}.aha-care-calendar-selection span{font-size:9px;color:#667789}.aha-care-calendar-selection strong{font-size:14px;color:#203247}.aha-care-calendar-selection p{margin:0;color:#4f6373;font-size:12px}.aha-care-calendar-legend .dot-green{background:#2f9b76}
    @media(max-width:900px){.aha-care-enhancements{width:100%;margin:14px 0}.aha-care-showcase-cards{grid-template-columns:repeat(3,minmax(0,1fr))}}
    @media(max-width:760px){.aha-care-enhancements{width:calc(100% - 20px);margin:14px auto;gap:12px}.aha-care-showcase{width:100%;padding:20px 18px;border-radius:19px}.aha-care-showcase h2{font-size:23px}.aha-care-showcase p{font-size:11px}.aha-care-showcase-cards{grid-template-columns:1fr;gap:7px}.aha-care-showcase-cards div{padding:10px}.aha-care-showcase-cards small{font-size:9px}.aha-care-calendar{width:100%;padding:16px;border-radius:19px}.aha-care-calendar-actions{gap:6px}.aha-care-calendar-today{width:58px;height:56px;flex-basis:58px}.aha-care-calendar-toggle{min-width:58px;height:36px}.aha-care-calendar-head h2{font-size:19px}.aha-care-calendar-head p{font-size:11px}.aha-care-calendar-grid>button,.aha-care-calendar-grid>.empty-day{min-height:clamp(32px,9vw,39px)}.aha-care-calendar-selection{align-items:flex-start;flex-direction:column;gap:5px}}
    @media(max-width:420px){.aha-care-calendar-head{align-items:flex-start}.aha-care-calendar-actions{flex-direction:column;align-items:stretch}.aha-care-calendar-today{display:none}.aha-care-calendar-toggle{min-width:60px}.aha-care-showcase{padding:17px 14px}.aha-care-showcase h2{font-size:20px}.aha-care-calendar{padding:14px}.aha-care-calendar-grid{gap:3px}}
  `}</style></>;
}

