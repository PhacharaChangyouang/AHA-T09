'use strict';
const crypto=require('node:crypto');const fs=require('node:fs');const path=require('node:path');
const TZ='Asia/Bangkok';const DAY=86400000;
const dateOf=d=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
function weekPeriod(input,now=new Date()){
 const today=dateOf(now),date=new Date(today+'T00:00:00Z');
 date.setUTCDate(date.getUTCDate()-(date.getUTCDay()+6)%7-7);
 const latest=date.toISOString().slice(0,10),start=input||latest,d=new Date(start+'T00:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==start||d.getUTCDay()!==1||start>latest||d.getTime()<date.getTime()-12*7*DAY)throw Error('Invalid completed week');
 return {start,end:new Date(d.getTime()+6*DAY).toISOString().slice(0,10),timezone:TZ};
}
async function ensureSchema(db){await db.query(fs.readFileSync(path.join(__dirname,'../sql/caregiver-reports.sql'),'utf8'));}
async function linkedElderly(caregiverId,{fetchImpl=fetch,env=process.env}={}){
 if(!env.AUTH_SERVICE_URL||!env.INTERNAL_API_KEY)throw Error('Family verification unavailable');
 const r=await fetchImpl(env.AUTH_SERVICE_URL.replace(/\/$/,'')+'/family/internal/'+encodeURIComponent(caregiverId)+'/elderly',{
  redirect:'error',signal:AbortSignal.timeout(5000),headers:{'x-internal-api-key':env.INTERNAL_API_KEY}});
 if(!r.ok)throw Error('Family verification unavailable');
 const p=await r.json();if(!Array.isArray(p.data))throw Error('Family verification unavailable');return p.data;
}
const OCCURRENCES=`WITH scheduled AS (
 SELECT h.reminder_id,h.user_id,d::date AS scheduled_date,h.reminder_time AS scheduled_time,
 (d::date+h.reminder_time) AT TIME ZONE 'Asia/Bangkok' AS scheduled_at
 FROM caregiver_schedule_history h CROSS JOIN generate_series($2::date,$3::date,interval '1 day') d
 WHERE h.user_id=$1 AND ((d::date+h.reminder_time) AT TIME ZONE 'Asia/Bangkok') >= $4::timestamptz AND h.is_active AND (h.start_date IS NULL OR h.start_date<=d::date)
 AND (h.end_date IS NULL OR h.end_date>=d::date)
 AND lower(trim(to_char(d,'Day')))=ANY(h.days_of_week)
 AND (d::date+h.reminder_time) AT TIME ZONE 'Asia/Bangkok'>=h.effective_from
 AND (h.effective_to IS NULL OR (d::date+h.reminder_time) AT TIME ZONE 'Asia/Bangkok'<h.effective_to)
), combined AS (
 SELECT s.scheduled_date::text AS day,s.scheduled_at,l.status,l.taken_at,true AS tracked,
 EXISTS(SELECT 1 FROM caregiver_report_snoozes z WHERE z.reminder_id=s.reminder_id AND z.user_id=s.user_id AND z.scheduled_date=s.scheduled_date AND z.scheduled_time=s.scheduled_time) AS snoozed
 FROM scheduled s LEFT JOIN reminder_logs l ON l.reminder_id=s.reminder_id AND l.user_id=s.user_id
 AND l.scheduled_date=s.scheduled_date AND l.scheduled_time=s.scheduled_time
 UNION ALL
 SELECT l.scheduled_date::text,(l.scheduled_date+l.scheduled_time) AT TIME ZONE 'Asia/Bangkok',l.status,l.taken_at,false,false
 FROM reminder_logs l WHERE l.user_id=$1 AND ((l.scheduled_date+l.scheduled_time) AT TIME ZONE 'Asia/Bangkok') >= $4::timestamptz AND l.scheduled_date BETWEEN $2::date AND $3::date
 AND NOT EXISTS(SELECT 1 FROM scheduled s WHERE s.reminder_id=l.reminder_id AND s.user_id=l.user_id AND s.scheduled_date=l.scheduled_date AND s.scheduled_time=l.scheduled_time)
) SELECT * FROM combined ORDER BY day,scheduled_at`;
function summarize(rows,complete){
 const count={trackedScheduled:0,confirmedOnTime:0,confirmedLate:0,confirmedEarly:0,unconfirmed:0,skipped:0,snoozed:0,invalid:0};
 for(const r of rows){
  if(r.tracked)count.trackedScheduled++;if(r.snoozed)count.snoozed++;
  if(r.status==='skipped'){count.skipped++;continue;}
  if(r.status!=='taken'){if(r.tracked)count.unconfirmed++;continue;}
  const diff=r.taken_at&&r.scheduled_at?(new Date(r.taken_at)-new Date(r.scheduled_at))/60000:NaN;
  if(!Number.isFinite(diff)){count.invalid++;continue;}
  if(diff<0)count.confirmedEarly++;else if(diff<=15)count.confirmedOnTime++;else count.confirmedLate++;
 }
 const confirmed=count.confirmedEarly+count.confirmedOnTime+count.confirmedLate;
 return {...count,confirmed,scheduled:complete?count.trackedScheduled:null,unconfirmed:complete?count.unconfirmed:null,
 confirmationPercent:complete&&count.trackedScheduled?Math.round(confirmed/count.trackedScheduled*10000)/100:null};
}
async function readReport(db,elderlyId,week,connectedAt){
 if(!connectedAt||!Number.isFinite(new Date(connectedAt).getTime()))throw Error('Connection history unavailable');
 const coverage=(await db.query('SELECT started_at FROM caregiver_report_coverage WHERE singleton=true')).rows[0];
 if(!coverage)throw Error('Report tracking unavailable');
 const complete=new Date(coverage.started_at)<=new Date(week.start+'T00:00:00+07:00')&&new Date(connectedAt)<=new Date(week.start+'T00:00:00+07:00');
 const rows=(await db.query(OCCURRENCES,[elderlyId,week.start,week.end,connectedAt])).rows;
 // A log without an audited occurrence means the denominator cannot be proved.
 const verifiedComplete=complete&&!rows.some(r=>!r.tracked);
 return {period:week,coverage:{complete:verifiedComplete,startedAt:new Date(coverage.started_at).toISOString(),connectionAcceptedAt:new Date(connectedAt).toISOString()},
 totals:summarize(rows,verifiedComplete),daily:Array.from({length:7},(_,i)=>{
  const day=new Date(new Date(week.start+'T00:00:00Z').getTime()+i*DAY).toISOString().slice(0,10);
  return {day,...summarize(rows.filter(r=>r.day===day),verifiedComplete)};
 }),lateAfterMinutes:15,delivery:{available:false,reason:'ยังไม่มีหลักฐานการแสดงแจ้งเตือนที่อุปกรณ์รายครั้ง'},
 disclaimer:'การยืนยันในระบบไม่ใช่หลักฐานว่ารับประทานยาจริง การไม่ยืนยันไม่ได้แปลว่าไม่ได้รับประทานยา'};
}
const hashToken=t=>crypto.createHash('sha256').update(t).digest('hex');
function jobToken(job,env){if(!env.INTERNAL_API_KEY)throw Error('Report signing unavailable');return crypto.createHmac('sha256',env.INTERNAL_API_KEY).update('aha-caregiver-report-v1\0'+job.id+'\0'+job.preference_version).digest('base64url');}
async function runMailJobs(db,{env=process.env,fetchImpl=fetch,now=new Date()}={}){
 if(env.CAREGIVER_REPORT_EMAIL_ENABLED!=='true')return;
 const today=dateOf(now),week=weekPeriod(undefined,now);
 // Queue on Monday after 08:00 Bangkok. A missed Monday can catch up Tuesday.
 const localHour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',hourCycle:'h23'}).format(now));
 const weekday=new Date(today+'T00:00:00Z').getUTCDay();
 if(weekday===1&&localHour>=8||weekday===2){
  await db.query(`INSERT INTO caregiver_report_mail_jobs(caregiver_id,preference_version,week_start)
   SELECT caregiver_id,version,$1::date FROM caregiver_report_preferences WHERE enabled=true
   ON CONFLICT(caregiver_id,week_start) DO NOTHING`,[week.start]);
 }
 await db.query("UPDATE caregiver_report_mail_jobs SET status='failed',lease_until=NULL WHERE (status='processing' AND attempts>=3 AND lease_until<now()) OR (status IN ('pending','processing') AND expires_at<=now())");
 const jobs=(await db.query(`UPDATE caregiver_report_mail_jobs SET status='processing',attempts=attempts+1,lease_until=now()+interval '2 minutes'
  WHERE id IN(SELECT j.id FROM caregiver_report_mail_jobs j JOIN caregiver_report_preferences p ON p.caregiver_id=j.caregiver_id
   AND p.enabled=true AND p.version=j.preference_version
   WHERE j.attempts<3 AND j.expires_at>now() AND j.next_attempt_at<=now()
   AND (j.status='pending' OR j.status='processing' AND j.lease_until<now())
   ORDER BY j.next_attempt_at LIMIT 10 FOR UPDATE OF j SKIP LOCKED) RETURNING *`)).rows;
 for(const job of jobs){
  try{
   const people=await linkedElderly(job.caregiver_id,{fetchImpl,env});
   if(!people.length){await db.query("UPDATE caregiver_report_mail_jobs SET status='cancelled' WHERE id=$1 AND attempts=$2",[job.id,job.attempts]);continue;}
   const current=(await db.query('SELECT enabled,version FROM caregiver_report_preferences WHERE caregiver_id=$1',[job.caregiver_id])).rows[0];
   if(!current?.enabled||current.version!==job.preference_version){await db.query("UPDATE caregiver_report_mail_jobs SET status='cancelled' WHERE id=$1 AND attempts=$2",[job.id,job.attempts]);continue;}
   const token=jobToken(job,env);
   await db.query("UPDATE caregiver_report_mail_jobs SET token_hash=$3 WHERE id=$1 AND attempts=$2 AND status='processing'",[job.id,job.attempts,hashToken(token)]);
   const response=await fetchImpl(env.AUTH_SERVICE_URL.replace(/\/$/,'')+'/family/internal/'+encodeURIComponent(job.caregiver_id)+'/report-email',{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json','x-internal-api-key':env.INTERNAL_API_KEY},
    body:JSON.stringify({jobId:job.id,token,week:typeof job.week_start==='string'?job.week_start.slice(0,10):dateOf(job.week_start)})});
   if(!response.ok)throw Error('Report mail not acknowledged');
   await db.query("UPDATE caregiver_report_mail_jobs SET status='sent',sent_at=now(),lease_until=NULL WHERE id=$1 AND attempts=$2 AND status='processing'",[job.id,job.attempts]);
  }catch(_){await db.query("UPDATE caregiver_report_mail_jobs SET status=CASE WHEN attempts>=3 THEN 'failed' ELSE 'pending' END,next_attempt_at=now()+interval '15 minutes',lease_until=NULL WHERE id=$1 AND attempts=$2 AND status='processing'",[job.id,job.attempts]);}
 }
 // Unsubscribe/re-enable invalidates outstanding links and queued mail.
 await db.query(`UPDATE caregiver_report_mail_jobs j SET status='cancelled',token_hash=NULL WHERE status IN ('pending','processing')
  AND NOT EXISTS(SELECT 1 FROM caregiver_report_preferences p WHERE p.caregiver_id=j.caregiver_id AND p.enabled=true AND p.version=j.preference_version)`);
 await db.query("DELETE FROM caregiver_report_mail_jobs WHERE expires_at<now()-interval '90 days'");
 await db.query("DELETE FROM caregiver_schedule_history WHERE effective_to<now()-interval '100 days'");
 await db.query("DELETE FROM caregiver_report_snoozes WHERE scheduled_date<(now() AT TIME ZONE 'Asia/Bangkok')::date-100");
}
module.exports={ensureSchema,weekPeriod,linkedElderly,readReport,summarize,runMailJobs,jobToken,hashToken};
