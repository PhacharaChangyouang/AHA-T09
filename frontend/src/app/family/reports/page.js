'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import {authApi,authFetch,familyApi} from '../../../services/api';
import styles from './reports.module.css';
const BASE='/api/caregiver/reports';
function weeks(){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const d=new Date(today+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7-7);
 return Array.from({length:13},(_,i)=>new Date(d.getTime()-i*7*86400000).toISOString().slice(0,10));
}
function dateLabel(value){return new Date(value+'T00:00:00+07:00').toLocaleDateString('th-TH',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',year:'numeric'});}
export default function CaregiverReports(){
 const [user,setUser]=useState(null),[checked,setChecked]=useState(false),[people,setPeople]=useState([]);
 const [person,setPerson]=useState(''),[week,setWeek]=useState(''),[periods,setPeriods]=useState([]);
 const [prefs,setPrefs]=useState(null),[report,setReport]=useState(null),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[loading,setLoading]=useState(false);
 const generation=useRef(0),reportGeneration=useRef(0),linkToken=useRef(null);
 const load=useCallback(async()=>{
  const v=++generation.current;++reportGeneration.current;setReport(null);setPrefs(null);setPeople([]);setError('');setBusy(false);setLoading(false);
  try{
   const me=await authApi.me();if(v!==generation.current)return;setUser(me.user||null);
   if(me.user?.role!=='caregiver')return;
   const [connections,preferences]=await Promise.all([familyApi.linkedElderly(),authFetch(BASE+'/preferences',{service:'reminder'})]);
   if(v!==generation.current)return;
   const list=Array.isArray(connections.data)?connections.data:[];setPeople(list);setPerson(current=>list.some(p=>p.user_id===current)?current:list[0]?.user_id||'');setPrefs(preferences.data);
   if(linkToken.current){
    const opened=await authFetch(BASE+'/open',{method:'POST',service:'reminder',body:{token:linkToken.current}});
    if(v!==generation.current)return;setWeek(opened.data.week);linkToken.current=null;setNotice('ตรวจสิทธิ์ลิงก์แล้ว เลือกผู้สูงอายุและกดเปิดรายงาน');
   }
  }catch(e){if(v===generation.current){if(e.status===401){setUser(null);setNotice('กรุณาเข้าสู่บัญชี AHA แล้วกลับมาที่หน้านี้');}else setError(e.message||'ยังโหลดหน้ารายงานไม่ได้');}}
  finally{if(v===generation.current)setChecked(true);}
 },[]);
 const invalidate=useCallback(()=>{generation.current++;reportGeneration.current++;linkToken.current=null;},[]);
 useEffect(()=>{
  const list=weeks();setPeriods(list);setWeek(list[0]);
  const consumeFragment=()=>{
   const fragment=new URLSearchParams(window.location.hash.slice(1)),token=fragment.get('report');
   if(!token)return false;
   window.history.replaceState(null,'',window.location.pathname+window.location.search);
   linkToken.current=/^[A-Za-z0-9_-]{43}$/.test(token)?token:null;
   if(!linkToken.current)setNotice('ลิงก์รายงานไม่ถูกต้อง กรุณาเลือกรายงานด้วยตนเอง');
   return true;
  };
  const hashChange=()=>{if(consumeFragment())load();};
  consumeFragment();load();window.addEventListener('focus',load);window.addEventListener('hashchange',hashChange);
  return()=>{invalidate();window.removeEventListener('focus',load);window.removeEventListener('hashchange',hashChange);};
 },[load,invalidate]);
 async function openReport(){
  const v=++reportGeneration.current;setReport(null);setError('');setLoading(true);
  try{
   const result=await authFetch(BASE+'?elderly_user_id='+encodeURIComponent(person)+'&week='+encodeURIComponent(week),{service:'reminder'});
   if(v===reportGeneration.current)setReport(result.data);
  }catch(e){if(v===reportGeneration.current){setError(e.message||'ยังเปิดรายงานไม่ได้');if(e.status===403)load();}}
  finally{if(v===reportGeneration.current)setLoading(false);}
 }
 function clearReport(){reportGeneration.current++;setReport(null);setLoading(false);}
 async function toggleEmail(){
  setBusy(true);setError('');const v=generation.current;
  try{const result=await authFetch(BASE+'/preferences',{method:'PUT',body:{enabled:!prefs.enabled},service:'reminder'});
   if(v===generation.current){setPrefs(p=>({...p,enabled:result.data.enabled}));setNotice(result.data.enabled?'เปิดรับอีเมลแล้ว เริ่มส่งตามรอบวันจันทร์ 08:00 น.':'ปิดรับอีเมลแล้ว ลิงก์เดิมจะใช้งานไม่ได้');}
  }catch(e){if(v===generation.current)setError(e.message||'บันทึกไม่สำเร็จ');}
  finally{if(v===generation.current)setBusy(false);}
 }
 const value=n=>n===null||n===undefined?'—':n.toLocaleString('th-TH');
 return <div className="aha-v3-page"><main className={styles.page}>
  <Link href="/family" className={styles.back}>← กลับหน้าครอบครัว</Link>
  <h1>รายงานผู้ดูแลรายสัปดาห์</h1><p>สรุปการยืนยันในแอป · จันทร์–อาทิตย์ · เวลาไทย</p>
  {error&&<p role="alert" className={styles.error}>{error}</p>}{notice&&<p role="status" className={styles.notice}>{notice}</p>}
  {!checked?<p role="status">กำลังตรวจสอบบัญชี…</p>:!user?<section className={styles.panel}><h2>เข้าสู่บัญชี AHA ก่อนเปิดรายงาน</h2><p>ใช้บัญชีผู้ดูแลที่ยังเชื่อมต่อกับผู้สูงอายุ หลังเข้าสู่ระบบให้กลับมาที่หน้านี้</p><a href="/" target="_blank" rel="noopener noreferrer">เปิด AHA เพื่อเข้าสู่ระบบ</a><button onClick={load}>ตรวจสอบการเข้าสู่ระบบอีกครั้ง</button></section>:user.role!=='caregiver'?<p className={styles.notice}>รายงานนี้สำหรับบัญชีผู้ดูแลที่ได้รับการเชื่อมต่อเท่านั้น</p>:<>
   <section className={styles.panel}><h2>เลือกรายงาน</h2>
    {!people.length?<p>ยังไม่มีผู้สูงอายุที่เชื่อมต่อ กรุณาเชื่อมต่อและให้ผู้สูงอายุตอบรับก่อน</p>:<div className={styles.filters}>
     <label>ผู้สูงอายุ<select value={person} onChange={e=>{clearReport();setPerson(e.target.value);}}>{people.map(p=><option key={p.user_id} value={p.user_id}>{p.name||'ผู้สูงอายุที่เชื่อมต่อ'}</option>)}</select></label>
     <label>สัปดาห์ที่สิ้นสุดแล้ว<select value={week} onChange={e=>{clearReport();setWeek(e.target.value);}}>{periods.map(w=><option key={w} value={w}>{dateLabel(w)} – {dateLabel(new Date(new Date(w+'T00:00:00Z').getTime()+6*86400000).toISOString().slice(0,10))}</option>)}</select></label>
     <button disabled={loading||!person||!week} onClick={openReport}>{loading?'กำลังโหลด…':'เปิดรายงาน'}</button>
    </div>}
   </section>
   {report&&<section className={styles.panel} aria-label="ผลรายงานรายสัปดาห์"><h2>{dateLabel(report.period.start)} – {dateLabel(report.period.end)}</h2>
    {!report.coverage.complete&&<p className={styles.notice}>ข้อมูลตารางยาในสัปดาห์นี้ยังไม่ครบ หรือเชื่อมต่อกันระหว่างสัปดาห์ จึงไม่คำนวณจำนวนที่ควรยืนยัน จำนวนที่ยังไม่ยืนยัน และเปอร์เซ็นต์ย้อนหลัง แสดงเฉพาะบันทึกที่มีหลังเชื่อมต่อกัน</p>}
    <div className={styles.cards}>{[['ตามตาราง',report.totals.scheduled],['ยืนยันตรงเวลา',report.totals.confirmedOnTime],['ยืนยันช้า',report.totals.confirmedLate],['ยืนยันก่อนเวลา',report.totals.confirmedEarly],['ยังไม่ยืนยัน',report.totals.unconfirmed],['เคยเลื่อนเตือน',report.totals.snoozed],['ข้ามตามบันทึก',report.totals.skipped]].map(([label,n])=><div key={label}><span>{label}</span><strong>{value(n)}</strong></div>)}</div>
    <p>ตรงเวลา = ยืนยันภายใน {report.lateAfterMinutes} นาทีหลังเวลาตามตาราง การเลื่อนเตือนนับแยกและไม่เพิ่มจำนวนตามตาราง</p>
    <div className={styles.table}><table><caption>ผลแยกรายวัน</caption><thead><tr><th scope="col">วัน</th><th scope="col">ตามตาราง</th><th scope="col">ยืนยันแล้ว</th><th scope="col">ยังไม่ยืนยัน</th><th scope="col">ข้ามตามบันทึก</th></tr></thead><tbody>{report.daily.map(d=><tr key={d.day}><th scope="row">{dateLabel(d.day)}</th><td>{value(d.scheduled)}</td><td>{value(d.confirmed)}</td><td>{value(d.unconfirmed)}</td><td>{value(d.skipped)}</td></tr>)}</tbody></table></div>
    <p className={styles.notice}>{report.disclaimer}</p><p>ผลการแสดงแจ้งเตือนบนอุปกรณ์: ยังไม่มีหลักฐานรายครั้ง จึงไม่นำมาสรุปว่าได้รับหรืออ่านแล้ว</p>
   </section>}
   <section className={styles.panel}><h2>อีเมลรายสัปดาห์</h2><p>ส่งวันจันทร์ 08:00 น. ไปยังอีเมลในโปรไฟล์ของคุณ อีเมลมีเพียงลิงก์ที่หมดอายุใน 48 ชั่วโมง ไม่มีข้อมูลสุขภาพ ต้องเข้าสู่ระบบและยังเชื่อมต่อกันจึงอ่านได้</p>
    {prefs?<><p>สถานะ: <strong>{prefs.enabled?'เลือกรับอีเมลแล้ว':'ยังไม่เลือกรับอีเมล'}</strong></p>
     {(!prefs.emailAvailable||!prefs.emailDispatchEnabled)&&<p className={styles.notice}>การส่งอีเมลยังไม่พร้อม กรุณาตรวจอีเมลในโปรไฟล์ การเชื่อมต่อ และสถานะระบบ</p>}
     <button disabled={busy||!prefs.enabled&&(!prefs.emailAvailable||!prefs.emailDispatchEnabled)} onClick={toggleEmail}>{busy?'กำลังบันทึก…':prefs.enabled?'ปิดรับอีเมล':'เปิดรับอีเมลรายสัปดาห์'}</button></>:<p>ยังโหลดการตั้งค่าอีเมลไม่ได้</p>}
   </section>
  </>}
 </main></div>;
}
