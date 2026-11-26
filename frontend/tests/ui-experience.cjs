// Real component handlers with disposable in-memory fixtures. No production API traffic.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { transform } = require('next/dist/build/swc');
const walk = n => !n || typeof n !== 'object' ? [] : Array.isArray(n) ? n.flatMap(walk) : [n, ...walk(n.props?.children)];
const text = n => n == null || typeof n === 'boolean' ? '' : Array.isArray(n) ? n.map(text).join('') : typeof n === 'object' ? text(n.props?.children) : String(n);
function fixture(states = []) {
  let index = 0;
  const hooks = { ...React, useState(initial) { const i = index++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], v => { states[i] = typeof v === 'function' ? v(states[i]) : v; }]; }, useRef: v => ({ current: v }), useEffect() {}, useMemo: fn => fn(), useCallback: fn => fn };
  return { hooks, states, render(C, props = {}) { index = 0; return C(props); } };
}
async function load(file, mocks = {}, globals = {}) {
  const out = await transform(fs.readFileSync(file, 'utf8'), { filename: file, jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } }, module: { type: 'commonjs' } });
  const mod = { exports: {} };
  vm.runInNewContext(out.code, { require: name => name.endsWith('/Language') ? { T: ({children}) => children, LanguageSelector: () => null } : name in mocks ? mocks[name] : name.endsWith('/AhaInstallCard') ? () => null : name.endsWith('.css') ? {} : require(name), module: mod, exports: mod.exports, console, Date, Intl, Map, Set, URL, ...globals });
  return mod.exports;
}
const person = { id: 'fixture-user', user_id: 'fixture-user', name: 'ตัวอย่างผู้ใช้ ชื่อยาวเพื่อทดสอบการตัดบรรทัด', phone: '0800000000', role: 'elderly', email: 'fixture@example.test', authProvider: 'local' };
const medicine = { id: 'fixture-med', reminder_id: 'fixture-med', user_id: 'fixture-user', medicine_name: 'วิตามินซี ชื่อรายการยาวสำหรับตรวจการจัดวางบนจอแคบ', dosage: 'ตามข้อมูลที่ผู้ใช้บันทึก', reminder_time: '08:11', frequency: 'daily', days_of_week: ['monday'], is_active: true, taken: false };
const form = { ...medicine, start_date: '', end_date: '' };
const connected = { ...person, id: 'connection-1', status: 'accepted' };
const history = Array.from({ length: 7 }, (_, i) => ({ scheduled_date: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10), status: i % 2 ? 'waiting' : 'taken' }));
function seeds(route, role = 'elderly', variant = '') {
  switch (route) {
    case 'home': return [{ ...person, role }, [medicine], [], { elderly: [person], today: [medicine], history }, [connected], '', '', false];
    case 'reminders': return [[medicine], form, variant === 'edit' ? medicine.id : null, ['edit', 'add'].includes(variant), false, false, '', ''];
    case 'family': return [{ ...person, role }, [connected], [person], { elderly: [person], today: [medicine], history }, person.user_id, '', form, null, variant === 'edit', false, false, '', '', variant === 'disconnect' ? connected : null];
    case 'voice': return [variant === 'text' ? 'text' : 'voice', 'idle', 'เตือนวิตามินซี ตอนแปดโมงสิบเอ็ดนาที', 'ตรวจสอบรายการก่อนบันทึกค่ะ', [{ role: 'user', text: 'เตือนวิตามินซี ตอนแปดโมงสิบเอ็ดนาที' }, { role: 'assistant', text: 'ตรวจสอบรายการก่อนบันทึกค่ะ' }], { stage: 'confirming', medicine_name: 'วิตามินซี', reminder_time: '08:11' }, '', '', true, true, true];
    case 'notifications': return [[{ id: 'note-1', title: 'ถึงเวลาทานยา', message: medicine.medicine_name, is_read: false, type: 'medicine_reminder', created_at: new Date().toISOString() }], false, '', 'all'];
    case 'profile': return [{ ...person, role }, person.name, 65, role];
    case 'emergency': return [false, false, false, null, '', '1669'];
    default: throw Error('Unknown fixture route');
  }
}
async function page(route, role = 'elderly', variant = '', apis = {}, globals = {}) {
  const f = fixture(seeds(route, role, variant)), calls = [];
  const Icon = (await load('src/components/AhaIcon.js')).default;
  const calendar = await load('src/components/AhaCaregiverEnhancements.jsx', { react: fixture().hooks, 'next/navigation': { usePathname: () => '/family' }, './AhaIcon': Icon });
  const voiceUnderstanding = await load('src/lib/voice-understanding.js');
  const Companion = (await load('src/components/AhaCompanion.jsx')).default;
  const mocks = { react: f.hooks, 'next/navigation': { useRouter: () => ({ push: p => calls.push(['route', p]), replace: p => calls.push(['replace', p]) }) }, 'next/image': ({ src, alt, ...props }) => React.createElement('img', { src, alt, ...props }), 'next/link': 'a', '../../components/AhaIcon': Icon, '../../components/SponsorCard': () => null, '../../components/GoogleSignInButton': () => React.createElement('button', {}, 'Google'), '../../components/AhaCaregiverEnhancements': calendar, '../../services/auth': { saveSession() {}, getAvatar: () => '' }, '../../services/api': apis, '../../services/push': {}, '../../services/reminder-changes': { publishReminderChange() {} }, '../../services/medication-status': await load('src/services/medication-status.js'), '../../services/notification-view': await load('src/services/notification-view.js') };
  const C = (await load(`src/app/${route}/page.js`, { ...mocks, '../../lib/voice-understanding': voiceUnderstanding, '../../components/AhaCompanion': Companion }, { window: { confirm: () => true, location: {}, dispatchEvent() {}, setTimeout() {} }, navigator: {}, CustomEvent: class {}, ...globals })).default;
  return { ...f, calls, component: C, tree: () => f.render(C) };
}
async function tests() {
  const BrandMark = (await load('src/components/AhaBrandMark.jsx')).default;
  let total = 0;
  const check = (v, label) => { assert.ok(v, label); total++; console.log('PASS', label); };
  for (const role of ['elderly', 'caregiver']) {
    const saved = [];
    const p = await page('reminders', role, '', { reminderApi: { updateStatus: async (...x) => saved.push(['toggle', ...x]), update: async (...x) => saved.push(['update', ...x]), create: async (...x) => saved.push(['create', ...x]), list: async () => ({ data: [medicine] }), remove: async id => saved.push(['remove', id]) } });
    let tree = p.tree();
    await walk(tree).find(n => n.props?.['aria-label'] === 'เปิดหรือปิดการเตือน').props.onClick();
    check(saved[0][0] === 'toggle' && saved[0][1] === medicine.id, role + ' reminder toggle retains the correct id');
    walk(p.tree()).find(n => n.type === 'button' && text(n) === 'แก้ไข').props.onClick();
    tree = p.tree();
    check(p.states[2] === medicine.id && p.states[3] && walk(tree).some(n => n.type === 'input' && n.props.value === medicine.medicine_name), role + ' edit opens populated form');
    await walk(tree).find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
    check(saved.some(x => x[0] === 'update' && x[1] === medicine.id && x[2].reminder_time === '08:11'), role + ' edit preserves exact minute and original save endpoint');
    walk(p.tree()).find(n => n.type === 'button' && text(n).includes('เพิ่มการเตือน')).props.onClick();
    tree = p.tree();
    check(p.states[2] === null && p.states[3], role + ' add opens new form without editing prior item');
    await walk(tree).find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
    check(!saved.some(x => x[0] === 'create') && p.states[6], role + ' empty medicine cannot be saved');
    walk(p.tree()).find(n => n.props?.['aria-label'] === 'ปิด').props.onClick();
    await walk(p.tree()).find(n => n.props?.['aria-label'] === 'ลบการเตือน').props.onClick();
    check(saved.some(x => x[0] === 'remove' && x[1] === medicine.id) && p.states[0].length === 0, role + ' delete removes the exact reminder from the list');
    const family = await page('family', role);
    const familyTree = family.tree();
    check(text(familyTree).includes('ยกเลิกการเชื่อมต่อ') && text(familyTree).includes('ส่งคำขอ'), role + ' family connection controls remain');
    if (role === 'caregiver') {
      const html = renderToStaticMarkup(familyTree);
      check(html.indexOf('ตารางยาของวันนี้') < html.indexOf('ภาพรวมการทานยา 7 วัน'), 'caregiver daily tracking appears before historical chart');
      check(html.includes('ปฏิทินการดูแล') && html.includes('กราฟแท่งสรุปการทานยา 7 วัน'), 'calendar and interactive seven-day chart both remain');
    }
  }
  for (const variant of ['voice', 'text']) {
    const p = await page('voice', 'elderly', variant);
    const tree = p.tree();
    check(text(tree).includes('08:11') && ['ยืนยัน', 'ยกเลิก'].every(t => walk(tree).some(n => n.type === 'button' && text(n) === t)), variant + ' exact-time confirmation and cancellation remain');
    check(walk(tree).some(n => n.props?.['aria-label'] === (variant === 'text' ? 'เปลี่ยนเป็นโหมดเสียง' : 'เปลี่ยนเป็นโหมดข้อความ')), variant + ' accessible mode toggle remains');
  }
  const location = {};
  const sos = await page('emergency', 'elderly', '', {}, { window: { location } });
  const sosTree = sos.tree();
  const hold = walk(sosTree).find(n => n.props?.['aria-label'] === 'กดค้างเพื่อขอความช่วยเหลือ');
  check(hold && hold.props.onPointerDown && hold.props.onPointerCancel && hold.props.onPointerUp, 'SOS keeps hold, release and cancellation handlers');
  check(!text(sosTree).includes('แจ้งเหตุแล้ว'), 'SOS does not display success before API acknowledgement');
  walk(sosTree).find(n => n.type === 'button' && text(n).includes('โทรทันที')).props.onClick();
  check(location.href === 'tel:1669', 'emergency dial remains separate from SOS notification');
  const timers = new Map(); let timerId = 0, notices = 0;
  const fakeTimers = { setTimeout(fn, ms) { const id = ++timerId; timers.set(id, { fn, ms }); return id; }, clearTimeout: id => timers.delete(id) };
  const holdPage = await page('emergency', 'elderly', '', { emergencyApi: { notify: async () => { notices++; return { success: true, notified: 1, deviceReceiptConfirmed: false }; } } }, fakeTimers);
  const holdButton = walk(holdPage.tree()).find(n => n.props?.['aria-label'] === 'กดค้างเพื่อขอความช่วยเหลือ');
  holdButton.props.onKeyDown({ key: ' ', repeat: false, preventDefault() {} });
  check(timers.size === 1 && [...timers.values()][0].ms === 2000 && notices === 0, 'keyboard SOS requires the same two-second hold');
  let repeatPrevented = false;
  holdButton.props.onKeyDown({ key: ' ', repeat: true, preventDefault() { repeatPrevented = true; } });
  check(timers.size === 1 && repeatPrevented, 'held key repeat cannot scroll the page or schedule duplicate SOS');
  holdButton.props.onKeyUp({ key: ' ', preventDefault() {} });
  check(timers.size === 0 && notices === 0 && holdPage.states[4] === '', 'releasing the key early cancels SOS and clears the pending instruction');
  holdButton.props.onPointerDown({ preventDefault() {}, currentTarget: {}, pointerId: 1 });
  holdButton.props.onBlur();
  check(timers.size === 0 && notices === 0 && holdPage.states[4] === '', 'leaving focus cancels a pending hold and clears the instruction');
  holdButton.props.onKeyDown({ key: 'Enter', repeat: false, preventDefault() {} });
  const pending = [...timers.values()][0]; timers.clear(); pending.fn();
  await new Promise(resolve => setImmediate(resolve));
  check(notices === 1 && holdPage.states[2] === true && holdPage.states[4].includes('ยังไม่ยืนยันว่าผู้ดูแลได้รับ'), 'completed hold records one SOS but never claims device receipt');
  const failed = await page('emergency', 'elderly', '', { emergencyApi: { notify: async () => { throw Error('fixture offline'); } } }, fakeTimers);
  const failedButton = walk(failed.tree()).find(n => n.props?.['aria-label'] === 'กดค้างเพื่อขอความช่วยเหลือ');
  failedButton.props.onKeyDown({ key: 'Enter', repeat: false, preventDefault() {} });
  const failTimer = [...timers.values()][0]; timers.clear(); failTimer.fn();
  await new Promise(resolve => setImmediate(resolve));
  check(!failed.states[2] && failed.states[4] === 'fixture offline', 'failed SOS stays unsuccessful and reports the error');
  const navFixture = fixture(), routes = [];
  const Nav = (await load('src/components/AhaNavigation.jsx', { react: navFixture.hooks, 'next/navigation': { useRouter: () => ({ push: p => routes.push(p) }), usePathname: () => '/emergency' }, './AhaIcon': () => null, './AhaBrandMark': BrandMark, '../services/api': {} })).default;
  const nav = navFixture.render(Nav);
  const buttons = walk(nav).filter(n => n.type === 'button');
  check(buttons.length === 5, 'primary navigation has exactly five destinations');
  const emergency = buttons.find(n => n.props['aria-label'] === 'ฉุกเฉิน');
  check(emergency.props.className.includes('danger') && emergency.props['aria-current'] === 'page', 'SOS tab retains semantic danger and current-page state');
  const effects = [], properties = new Map(), listeners = new Map();
  let editing = false;
  const viewport = { height:760, offsetTop:0, addEventListener:(name,fn)=>listeners.set('viewport-'+name,fn), removeEventListener:name=>listeners.delete('viewport-'+name) };
  const browser = { innerHeight:844, visualViewport:viewport, setTimeout:fn=>{fn();return 1;}, clearTimeout() {}, addEventListener:(name,fn)=>listeners.set('window-'+name,fn), removeEventListener:name=>listeners.delete('window-'+name) };
  const document = { activeElement:{matches:()=>editing}, documentElement:{style:{setProperty:(key,value)=>properties.set(key,value),removeProperty:key=>properties.delete(key)}}, addEventListener:(name,fn)=>listeners.set('document-'+name,fn), removeEventListener:name=>listeners.delete('document-'+name) };
  const viewportFixture = fixture();
  const ViewportNav = (await load('src/components/AhaNavigation.jsx', { react:{...viewportFixture.hooks,useEffect:fn=>effects.push(fn)}, 'next/navigation':{usePathname:()=>'/voice',useRouter:()=>({})}, './AhaIcon':()=>null, './AhaBrandMark': BrandMark, '../services/api':{} }, {window:browser,document})).default;
  viewportFixture.render(ViewportNav);
  const cleanup = effects[0]();
  check(properties.get('--aha-viewport-bottom-gap') === '0px', 'browser toolbar never lifts the mobile dock');
  viewport.height = 420; listeners.get('viewport-resize')();
  check(properties.get('--aha-viewport-bottom-gap') === '0px', 'non-editing viewport shrink never lifts the dock');
  editing = true; listeners.get('document-focusin')();
  check(properties.get('--aha-viewport-bottom-gap') === '424px', 'focused text input lifts dock above simulated keyboard');
  editing = false; listeners.get('document-focusout')();
  check(properties.get('--aha-viewport-bottom-gap') === '0px', 'leaving text input restores the bottom dock');
  cleanup();
  check(listeners.size === 0 && properties.size === 0, 'navigation removes viewport and focus listeners on unmount');
  console.log('TOTAL', total, 'passed (handler fixtures, not physical-device evidence)');
}
async function renderReview() {
  const BrandMark = (await load('src/components/AhaBrandMark.jsx')).default;
  const output = path.resolve('../ui-review');
  fs.mkdirSync(output, { recursive: true });
  const styles = [];
  for (const name of ['AhaVisualPolish', 'AhaResponsiveFix', 'AhaCaregiverEnhancements', 'AhaLayoutRefresh']) {
    const mod = await load(`src/components/${name}.jsx`, { react: fixture().hooks, 'next/navigation': { usePathname: () => '/not-family' }, './AhaIcon': () => null });
    styles.push(walk(mod.default()).filter(n => n.type === 'style').map(n => `<style>${n.props.children}</style>`).join(''));
  }
  const css = fs.readFileSync('src/app/globals.css', 'utf8') + '\n' + fs.readFileSync('src/app/family/family-dashboard.css', 'utf8');
  const sheets = fs.readdirSync('.next/static/css').filter(n => n.endsWith('.css')).map(n => fs.readFileSync('.next/static/css/' + n, 'utf8')).join('\n').replaceAll('/_next/static/media/', '../frontend/.next/static/media/');
  const variable = /--font-prompt:([^;}]+)/.exec(sheets)?.[1] || 'sans-serif';
  const all = [];
  for (const role of ['elderly', 'caregiver']) for (const route of ['home', 'reminders', 'family', 'voice', 'notifications', 'profile', 'emergency']) {
    const variants = route === 'voice' ? ['voice', 'text'] : route === 'reminders' ? ['', 'add', 'edit'] : route === 'family' ? ['', 'disconnect'] : [''];
    for (const variant of variants) {
      const p = await page(route, role, variant), body = renderToStaticMarkup(p.tree());
      const nf = fixture();
      const Nav = (await load('src/components/AhaNavigation.jsx', { react: nf.hooks, 'next/navigation': { usePathname: () => '/' + route, useRouter: () => ({}) }, './AhaIcon': (await load('src/components/AhaIcon.js')).default, './AhaBrandMark': BrandMark, '../services/api': {} })).default;
      const navigation = renderToStaticMarkup(nf.render(Nav));
      for (const theme of ['light', 'dark']) {
        const name = `${role}-${route}${variant ? '-' + variant : ''}-${theme}.html`;
        fs.writeFileSync(path.join(output, name), `<!doctype html><html lang="th" data-aha-appearance="${theme}"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>AHA source fixture ${role} ${route}</title><style>${sheets}\n${css}\n:root{--font-prompt:${variable}}body{font-family:var(--font-prompt),sans-serif}</style>${styles.join('')}<body>${body}${navigation}<script>document.querySelectorAll('img[src^="/"]').forEach(e=>e.src='../frontend/public'+e.getAttribute('src'))</script></body></html>`);
        all.push(name);
      }
    }
  }
  const rows = all.map(name => `<li><a href="${name}">${name}</a></li>`).join('');
  // The iframes provide real CSS viewport widths without pretending to emulate a phone OS.
  const sample = ['elderly-home-light', 'elderly-reminders-add-light', 'caregiver-family-light', 'elderly-notifications-dark', 'elderly-emergency-light', 'elderly-voice-text-dark'];
  fs.writeFileSync(path.join(output, 'index.html'), `<!doctype html><html lang="th"><meta charset="utf-8"><title>AHA source review</title><style>body{font-family:sans-serif;background:#eceff3;margin:20px}main{display:flex;gap:20px;flex-wrap:wrap}iframe{height:760px;border:1px solid #888;background:white}h2{font-size:16px}</style><h1>AHA — actual component markup with fixture data</h1><p>Not a live session. API, authentication, microphone, push and device keyboards are not connected.</p><main>${sample.map((name,i) => `<section><h2>${name} — ${i % 2 ? 390 : 320}px</h2><iframe title="${name}" width="${i % 2 ? 390 : 320}" src="${name}.html"></iframe></section>`).join('')}</main><ul>${rows}</ul></html>`);
  console.log('REVIEW', output, all.length, 'source-rendered fixtures');
}
module.exports = { load, fixture, page, walk, text };
if (require.main === module) (process.argv.includes('--render') ? renderReview() : tests()).catch(e => { console.error(e); process.exitCode = 1; });
