const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), React = require('react');
const { transform } = require('next/dist/build/swc');
const { NextRequest } = require('next/server');
let passed = 0;
function ok(v, t) { assert.ok(v, t); console.log('PASS', t); passed++; }
async function load(file, mocks = {}, globals = {}) {
 const out = await transform(fs.readFileSync(file, 'utf8'), { filename:file, jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'} });
 const mod={exports:{}}; vm.runInNewContext(out.code,{require:n=>n.endsWith('/Language')?{T:({children})=>children,LanguageSelector:()=>null}:n in mocks?mocks[n]:n.endsWith('/AhaInstallCard')?()=>null:require(n),module:mod,exports:mod.exports,process,Buffer,URL,Headers,console,fetch:(...args)=>global.fetch(...args),...globals}); return mod.exports;
}
function walk(n) { return !n||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(walk):[n,...walk(n.props?.children)]; }
function text(n) { return Array.isArray(n)?n.map(text).join(''):n==null||typeof n==='boolean'?'':typeof n==='object'?text(n.props?.children):String(n); }
async function main() {
 const states=[];let index=0,linked;const Google=()=>null;
 const hooks={...React,useEffect:()=>{},useRef:v=>({current:v}),useState:init=>{const i=index++;if(!(i in states))states[i]=typeof init==='function'?init():init;return[states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];}};
 const authApi={verifyGoogleLink:async b=>{if(b.currentCredential!=='4826')throw Error('PIN ไม่ถูกต้อง');return{linkGrant:'fixture-grant'};},linkGoogle:async b=>{linked=b;}};
 const Profile=(await load('src/app/profile/page.js',{'react':hooks,'next/navigation':{useRouter:()=>({replace(){}})},'next/image':()=>null,'next/link':'a','../../components/AhaIcon':()=>null,'../../components/GoogleSignInButton':Google,'../../services/api':{authApi},'../../services/auth':{clearSession(){}},'../../services/push':{}})).default;
 states[0]={id:'fixture',name:'Fixture',role:'elderly',email:'owner@example.com',authProvider:'local'};
 const render=()=>{index=0;return Profile();};
 const button=(t,title)=>walk(t).find(n=>n.type==='button'&&text(n)===title);
 const linkInput=t=>walk(t).filter(n=>n.type==='label'&&text(n)==='PIN ปัจจุบัน').at(-1).props.children.find(n=>n?.type==='input');
 let tree=render();ok(!walk(tree).some(n=>n.type===Google),'Google chooser hidden before server reauthentication');
 linkInput(tree).props.onChange({target:{value:'0000'}});tree=render();await button(tree,'ยืนยันบัญชี AHA').props.onClick();tree=render();
 ok(!walk(tree).some(n=>n.type===Google)&&text(tree).includes('PIN ไม่ถูกต้อง'),'wrong PIN keeps Google chooser hidden and shows error');
 linkInput(tree).props.onChange({target:{value:'4826'}});tree=render();await button(tree,'ยืนยันบัญชี AHA').props.onClick();tree=render();
 ok(walk(tree).some(n=>n.type===Google)&&text(tree).includes('ขั้นที่ 2'),'server verification reveals second Google linking step');
 await walk(tree).find(n=>n.type===Google).props.onCredential('fixture-google');
 ok(linked.linkGrant==='fixture-grant'&&!('currentCredential'in linked),'second step sends grant instead of PIN');
 tree=render();ok(walk(tree).some(n=>n.type==='a'&&n.props.href==='/forgot-pin'),'forgot PIN opens the dedicated recovery route');
 let callback,options,cleanup,mutation,resize,clicked=0,disabled=false;const element={clientWidth:300,replaceChildren(){}};
 const media={matches:false,addEventListener(){},removeEventListener(){}};
 const window={matchMedia:()=>media,addEventListener(){},removeEventListener(){},google:{accounts:{id:{initialize:o=>{callback=o.callback;},renderButton:(_,o)=>{options=o;}}}}};
 const document={documentElement:{dataset:{ahaAppearance:'light'}},getElementById:()=>({addEventListener(){},removeEventListener(){}})};
 const refs=[];let refIndex=0;
 const G=(await load('src/components/GoogleSignInButton.jsx',{react:{...React,useRef:v=>{const i=refIndex++;if(!refs[i])refs[i]={current:i===0?element:v};return refs[i];},useState:v=>[v,()=>{}],useEffect:fn=>{if(!cleanup)cleanup=fn();}}},{process:{env:{NEXT_PUBLIC_GOOGLE_CLIENT_ID:'fixture-client'}},window,document,MutationObserver:class{constructor(fn){mutation=fn;}observe(){}disconnect(){}},ResizeObserver:class{constructor(fn){resize=fn;}observe(){}disconnect(){}}})).default;
 const draw=()=>{refIndex=0;return G({onCredential:()=>clicked++,disabled});};draw();
 ok(options.width===300&&options.theme==='outline'&&options.logo_alignment==='left','Google uses measured width and left alignment');
 document.documentElement.dataset.ahaAppearance='dark';mutation();ok(options.theme==='filled_black','Google theme updates when appearance changes');
 element.clientWidth=240;resize();ok(options.width===240,'Google width updates for smaller screens');
 disabled=true;draw();callback({credential:'fixture'});ok(clicked===0,'disabled Google callback cannot submit');
 disabled=false;draw();callback({credential:'fixture'});ok(clicked===1,'enabled Google callback works');
 cleanup();callback({credential:'fixture'});ok(clicked===1,'unmounted callback cannot submit');
 process.env.NODE_ENV='production';process.env.AUTH_API_URL='https://auth.test';const bff=await load('src/app/api/bff/[service]/[...path]/route.js');
 let calls=0;global.fetch=async()=>{calls++;return Response.json({success:true,reauthRequired:true});};
 for(const path of ['google/link-challenge','me/recover-pin']){
  const call=async(headers={})=>bff.POST(new NextRequest('https://app.test/api/bff/auth/auth/'+path,{method:'POST',headers:{host:'app.test',origin:'https://app.test','x-aha-request':'1',...headers},body:'{}'}),{params:Promise.resolve({service:'auth',path:['auth',...path.split('/')]})});
  let r=await call();ok(r.status===401&&calls===0,path+' rejects anonymous requests');
  r=await call({cookie:'__Host-aha-access=fixture',origin:'https://evil.test'});ok(r.status===403&&calls===0,path+' rejects CSRF');
  r=await call({cookie:'__Host-aha-access=fixture'});ok(r.status===200&&r.headers.get('set-cookie').includes('Max-Age=0'),path+' preserves reauth-required cookie clearing');calls=0;
 }
 console.log('TOTAL',passed,'passed (fixtures; no physical device or real Google login)');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
