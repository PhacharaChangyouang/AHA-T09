const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {transform}=require('next/dist/build/swc'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
async function load(file,mocks){if(file.endsWith('/home/page.js'))mocks['../../services/medication-status']=await require('./ui-experience.cjs').load('src/services/medication-status.js');
 const out=await transform(fs.readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});
 const mod={exports:{}};vm.runInNewContext(out.code,{require:n=>n.endsWith('/Language')?{T:({children})=>children,LanguageSelector:()=>null}:n in mocks?mocks[n]:n.endsWith('/AhaInstallCard')?()=>null:require(n),module:mod,exports:mod.exports,process,Buffer,URL,Headers,console,crypto:require('node:crypto').webcrypto});return mod.exports.default;
}
const attacks=['<img src=x onerror=alert(1)>','<svg onload=alert(1)>','</script><script>alert(1)</script>','<iframe srcdoc="<script>alert(1)</script>"></iframe>','<details open ontoggle=alert(1)>','<a href="javascript:alert(1)">test</a>','<math><mtext><img src=x onerror=alert(1)>','<input autofocus onfocus=alert(1)>'];
let passed=0;
(async()=>{
 const view=await require('./ui-experience.cjs').load('src/services/notification-view.js');
 for(let i=0;i<attacks.length;i++){
  const evil=attacks[i];
  for(const page of ['elderly-home','caregiver-home','notifications','reminders']){
   const isHome=page.endsWith('-home'),role=page.startsWith('caregiver')?'caregiver':'elderly';
   let states=isHome?[{id:'audit-user',role,name:evil},[{id:'audit-reminder',medicine_name:evil,dosage:evil,reminder_time:'01:11',is_active:true}],[],{elderly:[{user_id:'audit-elderly',name:evil}],today:[{user_id:'audit-elderly',medicine_name:evil,dosage:evil,reminder_time:'01:11',reminder_id:'audit-reminder'}],history:[]},[],'','',false]:page==='notifications'?[[{id:'audit-notification',type:'medicine',title:evil,message:evil,is_read:false,created_at:'2026-10-17T00:00:00Z'}],false,'']:[[{id:'audit-reminder',medicine_name:evil,dosage:evil,reminder_time:'01:11',frequency:'daily',is_active:true}],{},null,false,false,false,'',''];
   const hooks={...React,useState:()=>[states.shift(),()=>{}],useEffect:()=>{},useCallback:fn=>fn,useRef:value=>({current:value}),useMemo:fn=>fn()};
   const file=isHome?'src/app/home/page.js':`src/app/${page}/page.js`;
   const Component=await load(file,{'react':hooks,'next/navigation':{useRouter:()=>({push(){},replace(){}})},'next/image':()=>null,'../../components/AhaIcon':()=>null,'../../components/SponsorCard':()=>null,'../../services/auth':{},'../../services/api':{},'../../services/reminder-changes':{},'../../services/notification-view':view});
   const html=renderToStaticMarkup(React.createElement(Component));
   assert.ok(!html.includes(evil)&&html.includes('&lt;'),page+' safely encodes payload '+i);
   assert.ok(!/<(?:script|iframe|svg|math|input|details)\b[^>]*(?:onload|onerror|ontoggle|onfocus|srcdoc)|<script>alert\(1\)/i.test(html),page+' has no injected executable element '+i);
   console.log('PASS',page,'XSS payload',i+1);passed++;
  }
 }
 console.log('TOTAL',passed,'server-rendered XSS cases passed; no browser execution or Production fixture writes');
})().catch(e=>{console.error('FAIL',e.message);process.exitCode=1;});
