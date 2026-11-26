import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Import the same dependency-free ES module as Next without changing package type.
const source = fs.readFileSync(new URL('../src/lib/voice-understanding.js', import.meta.url), 'utf8');
const { understandTime, extractMedicineName, pendingTurn, isMedicalAdvice, isCreateRequest, isEmergency, unsupportedSchedule } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

const times = [
  ['ตีหนึ่งสามนาที', '01:03'], ['ตีหนึ่งสิบเอ็ดนาที', '01:11'],
  ['ตีหนึ่งยี่สิบเอ็ดนาที', '01:21'], ['ตีห้าห้าสิบเก้านาที', '05:59'],
  ['เที่ยงคืนสิบเอ็ดนาที', '00:11'], ['เที่ยงครึ่ง', '12:30'],
  ['หนึ่งทุ่ม', '19:00'], ['สองทุ่มสิบสาม', '20:13'], ['หกทุ่ม', '00:00'],
  ['บ่ายโมง', '13:00'], ['บ่ายสองสามนาที', '14:03'], ['บ่ายสามโมงสิบเอ็ดนาที', '15:11'],
  ['หกโมงเย็น', '18:00'], ['หกโมงเช้า', '06:00'], ['แปดโมงครึ่ง', '08:30'],
  ['๑๓:๐๓', '13:03'], ['01:03', '01:03'], ['เวลา 23.59', '23:59'],
  ['สิบสามนาฬิกาสิบเอ็ดนาที', '13:11'], ['เวลา 0 นาฬิกา', '00:00'],
  ['หนึ่งโมงตอนเช้า', '01:00'], ['สามโมงตอนเย็น', '15:00'],
  ['ตีหนึ่งศูนย์สามนาที', '01:03'], ['ตี หนึ่ง สิบ สาม นาที', '01:13'],
];
for (const [text, expected] of times) test(`exact time: ${text}`, () => assert.equal(understandTime(text).time, expected));

for (const text of ['25:00', '23:60', '123:00', '12:999', 'ตีเจ็ด', 'บ่ายสิบโมง', 'เจ็ดทุ่ม', 'ตีหนึ่งหกสิบนาที', 'ตีหนึ่งหลายสิบนาที', 'ตีหนึ่งสิบสองสามนาที', '01:03:15']) {
  test(`invalid time must not become :00: ${text}`, () => {
    assert.equal(understandTime(text).status, 'invalid');
    assert.equal(understandTime(text).time, null);
  });
}
for (const text of ['หนึ่งโมง', 'สามโมง', 'เวลา 1', 'หนึ่งโมงเช้าและหนึ่งโมงเย็น', '08:00 หรือ 09:00']) {
  test(`clarify ambiguous time: ${text}`, () => assert.equal(understandTime(text).status, 'ambiguous'));
}

const names = [
  ['ช่วยเตือนกินยาความดันตอนสองทุ่มหน่อย', 'ความดัน'],
  ['เพิ่มรายการเตือนยาวิตามินซี เวลา 01:03', 'วิตามินซี'],
  ['เพิ่มยาความดันสองทุ่ม', 'ความดัน'],
  ['เตือนกิ๋นยาความดันแปดโมงเช้า', 'ความดัน'],
  ['เปลี่ยนชื่อยาเป็นวิตามินบีสอง', 'วิตามินบีสอง'],
  ['เตือนยาความดันหนึ่งโมง', 'ความดัน'],
  ['เตือนกินยา', null], ['เพิ่มรายการยา', null], ['สองทุ่มสิบสามนาที', null],
];
for (const [text, expected] of names) test(`medicine: ${text}`, () => assert.equal(extractMedicineName(text), expected));

const confirming = { intent: 'create_reminder', medicine_name: 'ความดัน', reminder_time: '20:11', stage: 'confirming', missing: null };
test('correct time, then explicitly confirm the corrected command', () => {
  const correction = pendingTurn('ไม่ใช่ เปลี่ยนเป็นสองทุ่มสิบสาม', confirming);
  assert.equal(correction.action, 'update');
  assert.equal(correction.command.reminder_time, '20:13');
  assert.equal(correction.command.medicine_name, 'ความดัน');
  const confirmation = pendingTurn('ยืนยันค่ะ', { ...correction.command, stage: 'confirming' });
  assert.equal(confirmation.action, 'confirm');
  assert.equal(confirmation.command.reminder_time, '20:13');
});
test('bare disagreement asks for correction instead of cancelling', () => assert.equal(pendingTurn('ไม่ใช่ค่ะ', confirming).action, 'reply'));
test('cancel is explicit', () => assert.equal(pendingTurn('ยกเลิกครับ', confirming).action, 'cancel'));
test('question is not confirmation', () => assert.equal(pendingTurn('ยืนยันแล้วหรือยัง', confirming).action, 'reply'));
test('invalid correction clears previous time so it cannot be confirmed', () => {
  const result = pendingTurn('เปลี่ยนเป็น25:99', confirming);
  assert.equal(result.action, 'clarify');
  assert.equal(result.command.reminder_time, null);
  assert.notEqual(pendingTurn('ยืนยัน', result.command).action, 'confirm');
});
test('relative correction preserves exact minute', () => assert.equal(pendingTurn('เลื่อนอีกสิบนาที', confirming).command.reminder_time, '20:21'));
test('cross-day shift requires clarification', () => assert.equal(understandTime('เลื่อนอีกสิบนาที', '23:55').status, 'invalid'));
test('missing name is collected separately', () => assert.equal(pendingTurn('วิตามินซี', { ...confirming, medicine_name: null, missing: 'medicine_name', stage: 'collecting' }).command.medicine_name, 'วิตามินซี'));
test('missing time cannot turn bare confirmation into a name', () => assert.equal(pendingTurn('ยืนยัน', { ...confirming, medicine_name: null, missing: 'medicine_name', stage: 'collecting' }).action, 'reply'));
test('adding reminder is not dosage advice', () => {
  assert.equal(isCreateRequest('เพิ่มยาความดันสองทุ่ม'), true);
  assert.equal(isMedicalAdvice('เพิ่มยาความดันสองทุ่ม'), false);
  assert.equal(isMedicalAdvice('เพิ่มขนาดยาได้ไหม'), true);
  assert.equal(isMedicalAdvice('หยุดยาได้ไหม'), true);
});
test('emergency is recognized during any conversation', () => assert.equal(isEmergency('ช่วยด้วย หายใจไม่ออก'), true));
test('non-daily request is not silently converted to every day', () => {
  assert.equal(unsupportedSchedule('เตือนยาวันเว้นวัน'), true);
  assert.equal(unsupportedSchedule('เตือนยาทุกวันจันทร์'), true);
  assert.equal(unsupportedSchedule('เตือนยาทุกวัน'), false);
});
