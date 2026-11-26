'use strict';
const express=require('express');const pool=require('./config/db');const authenticate=require('./middlewares/authenticate');
const reports=require('./caregiver-reports');const router=express.Router();
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
router.use(authenticate,(req,res,next)=>{
 res.set('Cache-Control','private, no-store');res.set('Pragma','no-cache');
 if(req.user.role!=='caregiver')return res.status(403).json({success:false,message:'เฉพาะบัญชีผู้ดูแลเท่านั้น'});
 // Browser mutations go through the existing same-origin BFF. Direct cookie
 // requests must also prove origin; bearer clients already prove possession.
 if(req.method!=='GET'&&!/^Bearer [^\s]+$/.test(req.headers.authorization||'')){
  const allowed=[process.env.FRONTEND_URL,'http://localhost:3000'].filter(Boolean).map(s=>s.replace(/\/$/,''));
  if(!allowed.includes(req.headers.origin))return res.status(403).json({success:false,message:'Cross-site request rejected'});
 }
 next();
});
async function emailAvailable(id){
 const r=await fetch(process.env.AUTH_SERVICE_URL.replace(/\/$/,'')+'/family/internal/'+id+'/report-email',{
  redirect:'error',signal:AbortSignal.timeout(5000),headers:{'x-internal-api-key':process.env.INTERNAL_API_KEY}});
 if(!r.ok)throw Error('Email availability unknown');const p=await r.json();return p.available===true;
}
router.get('/preferences',async(req,res)=>{
 try{
  const p=(await pool.query('SELECT enabled FROM caregiver_report_preferences WHERE caregiver_id=$1',[req.user.id])).rows[0];
  let available=false;try{available=await emailAvailable(req.user.id);}catch(_){}
  res.json({success:true,data:{enabled:p?.enabled===true,emailAvailable:available,emailDispatchEnabled:process.env.CAREGIVER_REPORT_EMAIL_ENABLED==='true',schedule:'วันจันทร์ 08:00 น. เวลาไทย',timezone:'Asia/Bangkok'}});
 }catch(_){res.status(503).json({success:false,message:'ยังโหลดการตั้งค่ารายงานไม่ได้'});}
});
router.put('/preferences',async(req,res)=>{
 if(typeof req.body?.enabled!=='boolean'||Object.keys(req.body).some(k=>k!=='enabled'))return res.status(400).json({success:false,message:'ข้อมูลการตั้งค่าไม่ถูกต้อง'});
 try{
  if(req.body.enabled){
   if(process.env.CAREGIVER_REPORT_EMAIL_ENABLED!=='true'||!await emailAvailable(req.user.id))return res.status(409).json({success:false,message:'ยังรับอีเมลไม่ได้ กรุณาตรวจอีเมลในโปรไฟล์และการเชื่อมต่อผู้สูงอายุ'});
   if(!(await reports.linkedElderly(req.user.id)).length)return res.status(403).json({success:false,message:'ยังไม่มีผู้สูงอายุที่เชื่อมต่อ'});
  }
  await pool.query(`INSERT INTO caregiver_report_preferences(caregiver_id,enabled) VALUES($1,$2)
   ON CONFLICT(caregiver_id) DO UPDATE SET enabled=EXCLUDED.enabled,
   version=CASE WHEN caregiver_report_preferences.enabled IS DISTINCT FROM EXCLUDED.enabled THEN gen_random_uuid() ELSE caregiver_report_preferences.version END,updated_at=now()`,[req.user.id,req.body.enabled]);
  res.json({success:true,data:{enabled:req.body.enabled}});
 }catch(_){res.status(503).json({success:false,message:'ยังบันทึกการตั้งค่าไม่ได้'});}
});
router.post('/open',async(req,res)=>{
 if(typeof req.body?.token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(req.body.token)||Object.keys(req.body).some(k=>k!=='token'))return res.status(400).json({success:false,message:'ลิงก์รายงานไม่ถูกต้อง'});
 try{
  const row=(await pool.query(`SELECT j.week_start::text AS week FROM caregiver_report_mail_jobs j
   JOIN caregiver_report_preferences p ON p.caregiver_id=j.caregiver_id AND p.enabled=true AND p.version=j.preference_version
   WHERE j.caregiver_id=$1 AND j.token_hash=$2 AND j.status='sent' AND j.expires_at>now()`,[req.user.id,reports.hashToken(req.body.token)])).rows[0];
  if(!row||!(await reports.linkedElderly(req.user.id)).length)return res.status(403).json({success:false,message:'ลิงก์หมดอายุ ถูกยกเลิก หรือคุณไม่มีสิทธิ์เปิดรายงานนี้'});
  res.json({success:true,data:{week:row.week}});
 }catch(_){res.status(503).json({success:false,message:'ยังตรวจสิทธิ์ลิงก์รายงานไม่ได้'});}
});
router.get('/',async(req,res)=>{
 const id=req.query.elderly_user_id;if(typeof id!=='string'||!UUID.test(id))return res.status(400).json({success:false,message:'กรุณาเลือกผู้สูงอายุ'});
 let period;try{period=reports.weekPeriod(req.query.week);}catch(_){return res.status(400).json({success:false,message:'เลือกสัปดาห์จันทร์ถึงอาทิตย์ที่สิ้นสุดแล้ว ภายใน 13 สัปดาห์'});}
 try{
  const people=await reports.linkedElderly(req.user.id),person=people.find(p=>String(p.user_id)===id);
  if(!person)return res.status(403).json({success:false,message:'ผู้สูงอายุรายนี้ไม่ได้เชื่อมต่อกับคุณ'});
  const data=await reports.readReport(pool,id,period,person.connected_at);
  // Recheck the exact accepted connection after computation; reconnects cannot
  // reuse an earlier relation to expose a report prepared under it.
  const after=(await reports.linkedElderly(req.user.id)).find(p=>String(p.user_id)===id);
  if(!after||after.connection_id!==person.connection_id||String(after.connected_at)!==String(person.connected_at))return res.status(403).json({success:false,message:'การเชื่อมต่อเปลี่ยนแปลง กรุณาโหลดใหม่'});
  res.json({success:true,data});
 }catch(_){res.status(503).json({success:false,message:'ยังโหลดรายงานไม่ได้ กรุณาลองใหม่ภายหลัง'});}
});
module.exports=router;
