const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), React = require('react');
const { transform } = require('next/dist/build/swc');
let count = 0;
function check(value, message) { assert.ok(value, message); count++; console.log('PASS', message); }
async function load(file, mocks = {}, globals = {}) {
  const out = await transform(fs.readFileSync(file, 'utf8'), { filename: file, jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } }, module: { type: 'commonjs' } });
  const mod = { exports: {} };
  vm.runInNewContext(out.code, { require: n => n.endsWith('/Language') ? { T: ({children}) => children, LanguageSelector: () => null } : n in mocks ? mocks[n] : n.endsWith('/AhaInstallCard') ? () => null : require(n), module: mod, exports: mod.exports, Date, Intl, console, ...globals });
  return mod.exports;
}
const walk = n => !n || typeof n !== 'object' ? [] : Array.isArray(n) ? n.flatMap(walk) : [n, ...walk(n.props?.children)];
const text = n => Array.isArray(n) ? n.map(text).join('') : n == null || typeof n === 'boolean' ? '' : typeof n === 'object' ? text(n.props?.children) : String(n);
function fixture(states) {
  let index = 0;
  return { hooks: { ...React, useState: initial => { const i = index++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; }, useRef: value => ({ current: value }), useEffect() {}, useMemo: fn => fn(), useCallback: fn => fn }, render(Component) { index = 0; return Component(); } };
}
async function main() {
  const view = await load('src/services/notification-view.js');
  const rows = [
    { id: 'read', is_read: true, created_at: '2026-10-17T17:05:00Z', title: 'Read' },
    { id: 'yesterday', is_read: false, created_at: '2026-10-17T16:59:00Z', title: 'Yesterday' },
    { id: 'today', is_read: false, created_at: '2026-10-17T17:10:00Z', title: 'Today', type: 'emergency' },
    { id: 'invalid', is_read: false, created_at: 'invalid', title: 'Invalid' },
  ];
  const before = JSON.stringify(rows);
  const groups = view.groupNotifications(rows, 'all', new Date('2026-10-17T17:15:00Z'));
  check(groups[0].label === 'วันนี้' && groups[1].label === 'เมื่อวาน', 'Bangkok midnight groups dates correctly on a UTC server');
  check(groups[0].items[0].id === 'today', 'newest notification is first');
  check(groups.at(-1).label === 'ไม่ระบุวันที่' && view.notificationTime('invalid') === '', 'bad timestamp cannot crash inbox');
  check(view.groupNotifications(rows, 'unread').flatMap(g => g.items).every(row => !row.is_read), 'unread filter excludes read entries');
  check(before === JSON.stringify(rows), 'presentation never mutates server data');
  for (const role of ['elderly', 'caregiver']) {
    const routes = [], saves = [];
    const states = [{ id: 'u', role, name: 'Example' }, [{ id: 'm1', medicine_name: 'Example', reminder_time: '08:00', taken: false }, { id: 'm2', medicine_name: 'Completed', reminder_time: '12:00', taken: true }], [], { elderly: [{ user_id: 'e1', name: 'Person' }], today: [{ reminder_id: 'r', user_id: 'e1', medicine_name: 'Example', reminder_time: '08:00', taken: false }], history: [] }, [{ status: 'accepted' }], '', '', false];
    const f = fixture(states);
    const Home = (await load('src/app/home/page.js', { react: f.hooks, 'next/navigation': { useRouter: () => ({ push: path => routes.push(path) }) }, 'next/image': () => null, '../../components/AhaIcon': () => null, '../../components/SponsorCard': () => null, '../../services/medication-status': await load('src/services/medication-status.js'), '../../services/auth': {}, '../../services/reminder-changes': { publishReminderChange() {} }, '../../services/api': { reminderApi: { markTaken: async id => saves.push(id) } } })).default;
    let tree = f.render(Home);
    if (role === 'elderly') for (const title of ['ความคืบหน้า', 'ไทม์ไลน์', 'รายการยาวันนี้']) check(text(tree).includes(title), 'elderly retains ' + title);
    const buttons = walk(tree).filter(n => n.type === 'button');
    for (const b of buttons) if (text(b) !== 'กินแล้ว') await b.props.onClick?.();
    const expected = role === 'elderly' ? ['/reminders', '/voice', '/emergency', '/profile', '/notifications'] : ['/family', '/voice', '/emergency', '/profile', '/notifications'];
    check(expected.every(path => routes.includes(path)), role + ' retains home navigation');
    check(text(tree).includes(role === 'elderly' ? 'ผู้ดูแล:' : 'ผู้สูงอายุ:'), role + ' retains family card');
    if (role === 'elderly') {
      check(buttons.filter(b => text(b) === 'กินแล้ว').length === 1, 'completed medicine has no taken button');
      await buttons.find(b => text(b) === 'กินแล้ว').props.onClick();
      tree = f.render(Home);
      check(saves[0] === 'm1' && !walk(tree).some(n => n.type === 'button' && text(n) === 'กินแล้ว'), 'taken API still updates card');
    }
  }
  for (const role of ['elderly', 'caregiver']) {
    const states = [{ id: 'u', name: 'Example', role, phone: '0800000000', email: 'fixture@example.test', authProvider: 'local' }, 'Example', 65, role];
    const f = fixture(states), stored = {}, calls = [];
    const Profile = (await load('src/app/profile/page.js', { react: f.hooks, 'next/navigation': { useRouter: () => ({ push() {}, replace() {} }) }, 'next/image': () => null, 'next/link': 'a', '../../components/AhaIcon': () => null, '../../components/GoogleSignInButton': () => null, '../../services/api': { authApi: { updateMe: async body => { calls.push(body); return { user: states[0] }; } } }, '../../services/medication-status': await load('src/services/medication-status.js'), '../../services/auth': { saveSession() {} }, '../../services/push': {} }, { localStorage: { setItem: (k,v) => { stored[k] = v; } }, window: { matchMedia: () => ({ matches: false }), dispatchEvent() {}, setTimeout() {} }, document: { documentElement: { dataset: {}, style: {} } }, CustomEvent: class {} })).default;
    let tree = f.render(Profile);
    check(['แก้ไขรูป', 'บันทึกข้อมูล', 'ลืม PIN ใช่ไหม?', 'ยืนยันบัญชี AHA', 'กฎหมายและความเป็นส่วนตัว', 'ติดต่อผู้ดูแลระบบ'].every(label => text(tree).includes(label)), role + ' retains profile operations');
    const personal = walk(tree).find(n => n.type === 'details' && text(n.props.children[0]).includes('ข้อมูลส่วนตัว'));
    check(text(personal).includes('เบอร์โทรศัพท์') && !text(personal).includes('เปิดการแจ้งเตือนยา'), role + ' phone grouped with personal information');
    check(walk(tree).filter(n => n.type === 'a' && ['/terms-of-service','/privacy-policy','/cookies-policy'].includes(n.props.href)).length === 3, role + ' retains all legal links');
    walk(tree).find(n => n.type === 'button' && n.props.id === 'aha-dark-mode').props.onClick();
    check(stored.aha_appearance === 'dark', role + ' dark switch persists theme');
    tree = f.render(Profile);
    walk(tree).find(n => n.type === 'button' && n.props.id === 'aha-system-theme').props.onClick();
    check(stored.aha_appearance === 'system', role + ' system theme remains available');
    tree = f.render(Profile);
    const support = walk(tree).find(n => n.type === 'details' && text(n.props.children[0]).includes('ติดต่อผู้ดูแลระบบ'));
    support.props.onToggle({ currentTarget: { open: true } });
    tree = f.render(Profile);
    check(walk(tree).some(n => n.type === 'form' && text(n).includes('ส่งถึงผู้ดูแลระบบ')), role + ' support opens original contact form');
    await walk(tree).find(n => n.type === 'button' && text(n) === 'บันทึกข้อมูล').props.onClick();
    check(Object.keys(calls[0]).sort().join(',') === 'age,name', role + ' save still sends only allowed fields');
  }
  const f = fixture([rows, false, '', 'all']), calls = [];
  const Inbox = (await load('src/app/notifications/page.js', { react: f.hooks, 'next/navigation': { useRouter: () => ({ replace() {}, push() {} }) }, '../../components/AhaIcon': () => null, '../../services/api': { authApi: {}, notificationApi: { markRead: async id => calls.push(['read', id]), markAllRead: async () => calls.push(['all']), remove: async id => calls.push(['remove', id]) } }, '../../services/notification-view': view })).default;
  let tree = f.render(Inbox);
  check(walk(tree).filter(n => n.type === 'article').length === rows.length, 'all notifications remain visible including emergency');
  check(walk(tree).filter(n => n.type === 'summary' && n.props['aria-label']?.startsWith('ตัวเลือกการแจ้งเตือน')).length === rows.length, 'every notification has touch and keyboard accessible options');
  await walk(tree).find(n => n.type === 'button' && n.props['aria-label'] === 'อ่านการแจ้งเตือน Read').props.onClick();
  check(calls.length === 0, 'opening an already read notification does not repeat the mutation');
  await walk(tree).find(n => n.type === 'button' && n.props['aria-label'] === 'อ่านการแจ้งเตือน Today').props.onClick();
  tree = f.render(Inbox);
  check(calls[0][1] === 'today', 'mark read targets original id');
  walk(tree).find(n => n.type === 'button' && text(n).startsWith('ยังไม่อ่าน')).props.onClick();
  tree = f.render(Inbox);
  check(walk(tree).filter(n => n.type === 'article').length === 2, 'read entry leaves unread filter');
  await walk(tree).find(n => n.type === 'button' && n.props['aria-label'] === 'ลบการแจ้งเตือน Yesterday').props.onClick();
  tree = f.render(Inbox);
  check(calls.at(-1)[0] === 'remove' && walk(tree).filter(n => n.type === 'article').length === 1, 'delete still works within filter');
  await walk(tree).find(n => n.type === 'button' && text(n).includes('อ่านทั้งหมด')).props.onClick();
  tree = f.render(Inbox);
  check(calls.at(-1)[0] === 'all' && text(tree).includes('อ่านครบแล้ว'), 'mark all retains empty unread state');
  console.log('TOTAL', count, 'passed (component fixtures; no physical device test)');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
