jest.mock('../src/config/db',()=>({query:jest.fn()}));
const {types}=require('pg');
const {isDue,localParts}=require('../src/scheduler');
const {spawnSync}=require('node:child_process');
const nowDate=new Date('2026-10-16T14:17:15Z'),now=localParts(nowDate);
const reminder={is_active:true,reminder_time:'21:17:00',days_of_week:['friday'],snooze_until:null};
const pgDate=value=>types.getTypeParser(1082)(value);
test('PostgreSQL DATE start/end for today remain due',()=>{
 expect(isDue({...reminder,start_date:pgDate('2026-10-16'),end_date:pgDate('2026-10-16')},now,nowDate)).toBe(true);
});
test('ISO date strings for today remain due',()=>{
 expect(isDue({...reminder,start_date:'2026-10-16',end_date:'2026-10-16'},now,nowDate)).toBe(true);
});
test('future PostgreSQL start date is not due',()=>{
 expect(isDue({...reminder,start_date:pgDate('2026-10-17')},now,nowDate)).toBe(false);
});
test('expired PostgreSQL end date is not due',()=>{
 expect(isDue({...reminder,end_date:pgDate('2026-10-15')},now,nowDate)).toBe(false);
});
test('unbounded reminder retains its existing schedule',()=>{
 expect(isDue(reminder,now,nowDate)).toBe(true);
});
test('weekly reminder is not due on an unselected weekday',()=>{
 expect(isDue({...reminder,days_of_week:['monday']},now,nowDate)).toBe(false);
});
test.each(['UTC','Asia/Bangkok'])('PostgreSQL calendar dates work with runtime TZ=%s',(tz)=>{
 const script=`const {types}=require('pg');const {isDue,localParts}=require('./src/scheduler');const nowDate=new Date('2026-10-16T14:17:15Z');const date=types.getTypeParser(1082)('2026-10-16');if(!isDue({is_active:true,reminder_time:'21:17:00',days_of_week:['friday'],start_date:date,end_date:date},localParts(nowDate),nowDate))process.exit(1);`;
 const r=spawnSync(process.execPath,['-e',script],{cwd:require('node:path').resolve(__dirname,'..'),env:{...process.env,TZ:tz},encoding:'utf8'});
 expect(r.status).toBe(0);
});
