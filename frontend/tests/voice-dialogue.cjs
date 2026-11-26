// Exercise real page handlers with disposable in-memory APIs, never production data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const React = require('react');
const { transform } = require('next/dist/build/swc');
const walk = n => !n || typeof n !== 'object' ? [] : Array.isArray(n) ? n.flatMap(walk) : [n, ...walk(n.props?.children)];
const label = n => n == null || typeof n === 'boolean' ? '' : Array.isArray(n) ? n.map(label).join('') : typeof n === 'object' ? label(n.props?.children) : String(n);
async function load(file, mocks = {}, globals = {}) {
  const out = await transform(fs.readFileSync(file, 'utf8'), { filename: file, jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } }, module: { type: 'commonjs' } });
  const mod = { exports: {} };
  vm.runInNewContext(out.code, { require: name => name in mocks ? mocks[name] : require(name), module: mod, exports: mod.exports, Date, Intl, console, ...globals });
  return mod.exports;
}
async function fixture(role, createOverride) {
  const states = ['text'], refs = [], calls = [], routes = [];
  let stateIndex = 0, refIndex = 0;
  const hooks = { ...React, useEffect() {}, useCallback: f => f,
    useRef(value) { const i = refIndex++; return refs[i] || (refs[i] = { current: value }); },
    useState(initial) { const i = stateIndex++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
  };
  const understanding = await load('src/lib/voice-understanding.js');
  const C = (await load('src/app/voice/page.js', {
    react: hooks, 'next/navigation': { useRouter: () => ({ push: p => routes.push(p) }) },
    'next/image': () => null, '../../components/AhaIcon': () => null,
    '../../components/AhaCompanion': () => null,
    '../../components/Language': { T: ({ children }) => children },
    '../../lib/voice-understanding': understanding,
    '../../services/auth': { getUser: () => ({ id: 'fixture-only', role }) },
    '../../services/push': {},
    '../../services/api': { authApi: {}, reminderApi: {
      create: async body => { calls.push(body); if (createOverride) return createOverride(body); return { data: { id: 'fixture-reminder' } }; },
      today: async () => ({ data: [{ medicine_name: 'วิตามินซี', reminder_time: '08:11', taken: false }] }),
    } },
  }, { window: { dispatchEvent() {}, setTimeout: fn => { fn(); }, speechSynthesis: { cancel() {} } }, CustomEvent: class {} })).default;
  const render = () => { stateIndex = 0; refIndex = 0; return C(); };
  const say = async text => {
    const input = walk(render()).find(n => n.type === 'input');
    input.props.onChange({ target: { value: text } });
    await walk(render()).find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
    return label(render());
  };
  return { render, say, calls, routes, states };
}

async function main() {
  let count = 0;
  function check(value, name) { assert.ok(value, name); count++; console.log('PASS', name); }
  for (const role of ['elderly', 'caregiver']) {
    const f = await fixture(role);
    await f.say('เพิ่มรายการเตือนยาความดันตอนตีหนึ่งสิบเอ็ดนาที');
    check(f.calls.length === 0 && label(f.render()).includes('01:11'), role + ': exact minute shown before any API write');
    await f.say('ไม่ใช่ เปลี่ยนเป็นตีหนึ่งสิบสามนาที');
    check(f.calls.length === 0 && label(f.render()).includes('01:13'), role + ': correction stays uncommitted');
    await f.say('ยืนยันค่ะ');
    check(f.calls.length === 1 && f.calls[0].medicine_name === 'ความดัน' && f.calls[0].reminder_time === '01:13', role + ': confirmed values sent to existing API');
    check(!('user_id' in f.calls[0]) && f.calls[0].frequency === 'daily', role + ': no model-supplied identity or silent frequency change');
    await f.say('ยืนยัน');
    check(f.calls.length === 1, role + ': repeated confirmation cannot recreate reminder');

    const missing = await fixture(role);
    await missing.say('เตือนกินยา');
    await missing.say('วิตามินซี');
    await missing.say('สองทุ่มสิบเอ็ดนาที');
    check(missing.calls.length === 0 && label(missing.render()).includes('20:11'), role + ': collects name and time across three turns');
    await missing.say('เลื่อนอีกสิบนาที');
    check(label(missing.render()).includes('20:21'), role + ': relative correction preserves minute');
    await missing.say('ยกเลิกครับ');
    await missing.say('ยืนยัน');
    check(missing.calls.length === 0, role + ': cancellation prevents later save');

    const bad = await fixture(role);
    await bad.say('เตือนยาความดันสองทุ่ม');
    await bad.say('เปลี่ยนเป็น25:60');
    await bad.say('ยืนยัน');
    check(bad.calls.length === 0 && !walk(bad.render()).some(n => n.props?.['aria-label'] === 'ยืนยันการตั้งเตือนยา'), role + ': bad correction invalidates old confirmable time');
    await bad.say('หนึ่งโมง');
    check(bad.calls.length === 0 && label(bad.render()).includes('ช่วงเช้า'), role + ': ambiguous time asks instead of guessing');

    const emergency = await fixture(role);
    await emergency.say('เตือนกินยา');
    await emergency.say('ช่วยด้วย หายใจไม่ออก');
    check(emergency.routes.includes('/emergency') && emergency.calls.length === 0, role + ': emergency interrupts missing-name collection without sending SOS');

    const security = await fixture(role);
    await security.say('เตือนกินยา');
    await security.say('เปลี่ยนรหัสผ่านให้หน่อย');
    check(security.calls.length === 0 && label(security.render()).includes('ไม่สามารถเปลี่ยนรหัสผ่าน'), role + ': pending conversation cannot absorb credential commands');
    await security.say('เปิดหน้าการแจ้งเตือน');
    check(security.routes.includes('/notifications'), role + ': opening inbox does not change notification preference');

    const unsupported = await fixture(role);
    await unsupported.say('เตือนยาความดันวันเว้นวันตอนสองทุ่ม');
    await unsupported.say('ยืนยัน');
    check(unsupported.calls.length === 0, role + ': unsupported schedule is never saved as daily');

    const advice = await fixture(role);
    await advice.say('เพิ่มขนาดยาความดันได้ไหม');
    check(advice.calls.length === 0 && label(advice.render()).includes('ไม่สามารถวินิจฉัย'), role + ': dosage advice never creates reminder');

    const failure = await fixture(role, () => { throw Object.assign(new Error('fixture network failure'), { status: 503 }); });
    await failure.say('เพิ่มยาความดันสองทุ่ม');
    await failure.say('ยืนยัน');
    check(failure.calls.length === 1 && !failure.states[3].includes('เรียบร้อย'), role + ': failed API cannot claim successful save');
  }
  console.log(`Voice dialogue: ${count} checks passed (mock APIs, no microphone evaluation).`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
