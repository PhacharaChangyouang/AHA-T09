const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {transform}=require('next/dist/build/swc');
const React=require('react');
let checks=0;
function check(value,name){assert.ok(value,name);checks++;console.log('PASS',name);}
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const window=new EventTarget();window.setTimeout=()=>0;window.clearTimeout=()=>{};window.setInterval=()=>0;window.clearInterval=()=>{};const document=new EventTarget();document.visibilityState='visible';
const localStorage={getItem:()=> '[]',setItem(){}};
async function load(file,mocks={}){if(file.endsWith('/home/page.js'))mocks['../../services/medication-status']=await require('./ui-experience.cjs').load('src/services/medication-status.js');const out=await transform(fs.readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});const m={exports:{}};vm.runInNewContext(out.code,{module:m,exports:m.exports,require:n=>n.endsWith('/Language')?{T:({children})=>children,LanguageSelector:()=>null}:n in mocks?mocks[n]:n.endsWith('/AhaInstallCard')?()=>null:require(n),window,document,CustomEvent,localStorage,Date,console,fetch:(...args)=>global.fetch(...args)});return m.exports;}
const notification={id:'notice',related_id:'medicine',type:'medicine_reminder',message:'test'};
function findButton(node,text){if(!node||typeof node!=='object')return null;if(node.type==='button'&&node.props.children===text)return node;for(const child of [node.props?.children].flat(Infinity)){const b=findButton(child,text);if(b)return b;}return null;}
async function managerFixture(sync,apis,overrides={}){
 const states=[true,notification,false,true,false,'',false,'denied',false,false,null];
 const refs=[{current:new Set()},{current:notification},{current:0},{current:{}}];let stateIndex=0,refIndex=0;const effects=[];
 Object.assign(states,overrides);
 const hooks={...React,useState:init=>{const i=stateIndex++;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];},useRef:()=>refs[refIndex++],useCallback:fn=>fn,useEffect:fn=>effects.push(fn)};
 const Component=(await load('src/components/MedicationNotificationManager.jsx',{'react':hooks,'next/navigation':{useRouter:()=>({})},'next/image':()=>null,'../services/auth':{getUser:()=>({id:'u',role:'elderly'})},'../services/api':apis,'../services/reminder-changes':sync,'../services/push':{}})).default;
 return {tree:Component(),states,effects,refs};
}
async function main(){
 const sync=await load('src/services/reminder-changes.js');let events=[];window.addEventListener('aha-reminders-refresh',e=>events.push(e.detail));
 const hint=await managerFixture(sync,{}, {6:true,8:true,9:true});
 const closeHint=findButton(hint.tree,'×');
 assert.ok(closeHint);await closeHint.props.onClick();
 check(hint.states[8]===false&&hint.states[3]===true&&hint.states[9]===false&&hint.states[11]===true,'dismissing setup hint closes overlays without disabling push preference');
 const originalTimeout=window.setTimeout,originalClearTimeout=window.clearTimeout;
 for(const permission of ['denied','unsupported','default']){
  let timeout;window.setTimeout=(fn,delay)=>{timeout={fn,delay};return 1;};window.clearTimeout=()=>{};
  const blocked=await managerFixture(sync,{}, {1:null,6:false,7:permission,8:true,9:true});
  const effect=blocked.effects.find(fn=>String(fn).includes('setShowBell')&&String(fn).includes('8000'));
  assert.ok(effect);const cleanup=effect();
  check(timeout?.delay===8000,permission+' setup hint has a bounded timer even before subscription repair finishes');
  timeout.fn();
  check(blocked.states[8]===false&&blocked.states[9]===false&&blocked.states[11]===true&&blocked.states[3]===true,permission+' setup timeout hides both overlays and preserves notification preference');
  cleanup();
 }
 let timeout;window.setTimeout=(fn,delay)=>{timeout={fn,delay};return 1;};
 const dismissed=await managerFixture(sync,{}, {1:null,6:true,8:false,9:false,11:true});
 dismissed.effects.find(fn=>String(fn).includes('setShowBell')&&String(fn).includes('8000'))();
 check(!timeout,'dismissed hint does not reopen when push status changes');
 const toast=await managerFixture(sync,{}, {1:null,5:'fixture push unavailable'});
 const toastEffect=toast.effects.find(fn=>String(fn).includes('8000')&&String(fn).includes('setError'));
 assert.ok(toastEffect);toastEffect();timeout.fn();
 check(toast.states[5]==='','push failure toast expires without hiding a medicine action failure');
 const retry=await managerFixture(sync,{}, {1:notification,5:'fixture medicine action unavailable'});timeout=null;
 retry.effects.find(fn=>String(fn).includes('8000')&&String(fn).includes('setError'))();
 check(!timeout&&retry.states[5]!=='','medicine action failure is retained for retry');
 window.setTimeout=originalTimeout;window.clearTimeout=originalClearTimeout;
 global.fetch=async()=>({ok:true,status:200,text:async()=>JSON.stringify({success:true,data:{id:'medicine'}})});
 const api=await load('src/services/api.js',{'./reminder-changes':sync});
 for(const [label,fn] of [['elderly delete',()=>api.reminderApi.remove('medicine')],['caregiver delete',()=>api.caregiverApi.removeReminder('medicine')],['taken',()=>api.reminderApi.markTaken('medicine')],['snooze',()=>api.reminderApi.snooze('medicine')]]){
 events=[];await fn();check(events.length===1&&events[0].reminderId==='medicine',label+' publishes one shared invalidation');
 }
 events=[];global.fetch=async()=>({ok:false,status:500,text:async()=>'{"message":"failure"}'});
 await assert.rejects(()=>api.reminderApi.markTaken('medicine'));check(events.length===0,'failed save does not publish success');
 check(!sync.isActionableReminder(undefined),'deleted reminder is not actionable');
 check(!sync.isActionableReminder({is_active:false}),'disabled reminder is not actionable');
 check(!sync.isActionableReminder({taken:true}),'taken reminder is not actionable');
 check(!sync.isActionableReminder({snooze_until:new Date(Date.now()+600000).toISOString()}),'future snooze hides the old alert');
 check(sync.isActionableReminder({is_active:true,snooze_until:new Date(Date.now()-1000).toISOString()}),'due snooze remains actionable');
 for(const action of ['taken','snooze']){
  let saved=0,reads=0;const apis={reminderApi:{markTaken:async()=>{saved++;},snooze:async()=>{saved++;}},notificationApi:{markRead:async()=>{reads++;throw Error('ack unavailable');}}};
  const f=await managerFixture(sync,apis);const button=findButton(f.tree,action==='taken'?'ทานยาแล้ว':'เลื่อน 10 นาที');assert.ok(button);await button.props.onClick();
  check(saved===1&&reads===1&&f.states[1]===null&&f.states[5]==='','saved '+action+' closes card without error when acknowledgement fails');
 }
 let f=await managerFixture(sync,{reminderApi:{markTaken:async()=>{throw Object.assign(Error('missing'),{status:404});}},notificationApi:{markRead:async()=>{}}});
 events=[];await findButton(f.tree,'ทานยาแล้ว').props.onClick();check(f.states[1]===null&&f.states[5]===''&&events.some(e=>e.action==='removed'),'404 closes stale card and refreshes without a red error');
 f=await managerFixture(sync,{reminderApi:{markTaken:async()=>{throw Object.assign(Error('offline'),{status:503});}},notificationApi:{markRead:async()=>{}}});
 await findButton(f.tree,'ทานยาแล้ว').props.onClick();check(f.states[1]===notification&&f.states[5]==='offline','real save failure keeps card and exposes retry error');
 for(const action of ['removed','disabled','taken','snoozed','updated']){
  f=await managerFixture(sync,{reminderApi:{today:async()=>({data:[]})},notificationApi:{markRead:async()=>{}}});
  const effect=f.effects.find(fn=>String(fn).includes("addEventListener('aha-reminders-refresh'"));assert.ok(effect);const cleanup=effect();
  sync.publishReminderChange({action,reminderId:'medicine'});
  check(f.states[1]===null&&f.states[5]==='',action+' event immediately clears matching open card');cleanup();
 }
 for (const role of ['elderly','caregiver']) {
  let states=[{id:'u',role,name:'Audit'},[{id:'medicine',taken:false}],[],{elderly:[],today:[],history:[]},[], '', '',false];
  let si=0;const effects=[];
  const hooks={...React,useState:()=>{const i=si++;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];},useRef:value=>({current:value}),useEffect:fn=>effects.push(fn),useMemo:fn=>fn()};
  const pending=[];
  const get=()=>new Promise(resolve=>pending.push(resolve));
  const Home=(await load('src/app/home/page.js',{'react':hooks,'next/navigation':{useRouter:()=>({})},'next/image':()=>null,'../../components/AhaIcon':()=>null,'../../components/SponsorCard':()=>null,'../../services/auth':{},'../../services/reminder-changes':sync,'../../services/api':{reminderApi:{today:get},caregiverApi:{summary:get}}})).default;
  Home();const effect=effects.find(fn=>String(fn).includes("addEventListener('aha-reminders-refresh'"));assert.ok(effect);const cleanup=effect();
  sync.publishReminderChange({action:'taken',reminderId:'medicine'});
  sync.publishReminderChange({action:'taken',reminderId:'medicine'});
  const latest=role==='caregiver'?{data:{elderly:[],today:[{taken:true}],history:[]}}:{data:[{id:'medicine',taken:true}]};
  const older=role==='caregiver'?{data:{elderly:[],today:[{taken:false}],history:[]}}:{data:[{id:'medicine',taken:false}]};
  pending[1](latest);await new Promise(resolve=>setImmediate(resolve));
  pending[0](older);await new Promise(resolve=>setImmediate(resolve));
  check(role==='caregiver'?states[3].today[0].taken:states[1][0].taken,role+' Home refreshes taken and ignores older responses');cleanup();
 }
 console.log('TOTAL',checks,'passed');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
