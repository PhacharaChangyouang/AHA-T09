const assert = require('node:assert/strict');
const { load, fixture, walk, text } = require('./ui-experience.cjs');
let passed = 0;
const check = (condition, label) => { assert.ok(condition, label); passed++; console.log('PASS', label); };
async function main() {
  const status = await load('src/services/medication-status.js');
  const now = new Date('2026-10-18T09:00:00Z'); // 16:00 Bangkok
  const future = { user_id: 'a', reminder_time: '19:00', taken: false };
  const due = { user_id: 'a', reminder_time: '15:00', taken: false };
  check(status.personMedicationStatus([future], now).tone === 'later', 'future dose is not awaiting confirmation');
  check(status.personMedicationStatus([{ ...due, taken: true }, future], now).label.includes('1/2'), 'partial completion with future dose is described accurately');
  check(status.personMedicationStatus([due, future], now).label === 'รอยืนยัน 1 รายการ', 'waiting count excludes future doses');
  check(status.personMedicationStatus([{ ...due, taken: true }], now).tone === 'done', 'all taken is complete');
  check(status.personMedicationStatus([], now).tone === 'later', 'no medicines is not a completed dose');
  check(status.medicationDue({ reminder_time: '16:00' }, now), 'dose is due exactly at its Bangkok minute');

  const translations = await load('src/services/translations.js');
  const events = [], storage = {}, listeners = new Set();
  const language = await load('src/components/Language.jsx', {
    react: { ...require('react'), useEffect() {}, useSyncExternalStore: (subscribe, snapshot) => { listeners.add(subscribe); return snapshot(); } },
    '../services/translations': translations,
  }, { window: { localStorage: { getItem: k => storage[k], setItem: (k,v) => { storage[k] = v; } }, dispatchEvent: e => events.push(e.type), addEventListener() {}, removeEventListener() {} }, Event: class { constructor(type) { this.type = type; } } });
  const selector = () => walk(language.LanguageSelector()).find(n => n.type === 'select');
  check(selector().props.value === 'th', 'language defaults to Thai');
  selector().props.onChange({ target: { value: 'en' } });
  check(selector().props.value === 'en' && storage.aha_language === 'en' && events.length === 1, 'English selection persists and notifies mounted interface');
  check(language.T({ children: 'หน้าหลัก' }) === 'Home', 'interface label changes without remounting forms');
  check(language.T({ children: 'My medicine <script>' }) === 'My medicine <script>', 'unknown and user data remain plain unchanged text');
  selector().props.onChange({ target: { value: 'th' } });
  check(language.T({ children: 'หน้าหลัก' }) === 'หน้าหลัก', 'Thai can be restored');
  check(translations.translate('ยืนยันและตั้ง PIN ใหม่', 'en') === 'Confirm new PIN', 'recovery confirmation has English copy');

  for (const role of ['elderly', 'caregiver']) {
    const states = [{ id: 'fixture', role, authProvider: 'local' }, false, 'password', '', '1234', '4321', false, '', false];
    const f = fixture(states), requests = [], cleared = [];
    let fail = false;
    const Recovery = (await load('src/app/forgot-pin/page.js', { react: f.hooks, 'next/link': 'a', 'next/navigation': { useRouter: () => ({ replace() {} }) }, '../../components/GoogleSignInButton': () => null, '../../services/api': { authApi: { recoverPin: async payload => { requests.push(payload); if (fail) throw Object.assign(new Error('Wrong current password'), { status: 401 }); } } }, '../../services/auth': { clearSession: () => cleared.push(true) } })).default;
    const render = () => f.render(Recovery);
    const submit = async () => { await walk(render()).find(n => n.type === 'form' && walk(n).some(field => field.type === 'input' && field.props.inputMode === 'numeric')).props.onSubmit({ preventDefault() {} }); await new Promise(resolve => setImmediate(resolve)); };
    await submit(); check(requests.length === 0 && states[7], role + ' mismatched PIN never sends recovery request');
    states[5] = '1234'; await submit(); check(requests.length === 0, role + ' recovery requires existing password');
    states[3] = 'fixture-only-password'; fail = true; await submit(); check(states[0] && !states[8] && !cleared.length && states[7], role + ' wrong password 401 preserves account context and never shows success');
    fail = false; await submit(); check(states[8] && cleared.length === 1 && states[3] === '' && states[4] === '' && states[5] === '', role + ' successful recovery clears local fields and session');
    const payload = requests.at(-1); check(Object.keys(payload).sort().join(',') === 'confirmNewPin,currentCredential,method,newPin', role + ' recovery cannot submit a replacement email destination');
    states[0] = null; states[8] = false;
    check(!walk(render()).some(n => n.type === 'input' && n.props.inputMode === 'numeric') && walk(render()).some(n => n.type === 'input' && n.props.type === 'email') && text(render()).includes('เข้าสู่ระบบด้วยรหัสผ่านหรือ Google'), role + ' anonymous recovery offers email request and sign-in without a PIN mutation form');
  }
  console.log('TOTAL', passed, 'passed (fixtures, not live device tests)');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
