// Task-specific understanding. No remote model, audio storage or generated actions.
const ONES = { ศูนย์: 0, หนึ่ง: 1, เอ็ด: 1, สอง: 2, สาม: 3, สี่: 4, ห้า: 5, หก: 6, เจ็ด: 7, แปด: 8, เก้า: 9 };
const NUMBER = '(?:\\d{1,3}|ศูนย์(?:หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า)|(?:ยี่|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า)?สิบ(?:เอ็ด|หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า)?|ศูนย์|หนึ่ง|เอ็ด|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า)';
const POLITE = /(?:นะครับ|นะคะ|นะค่ะ|ครับ|ค่ะ|คะ|จ้ะ|จ้า|หน่อย|ด้วย)[.!?。]*$/;

export function normalizeVoiceText(value) {
  return String(value || '').normalize('NFC')
    .replace(/[๐-๙]/g, (digit) => String('๐๑๒๓๔๕๖๗๘๙'.indexOf(digit)))
    .replace(/กิ๋น|กิ่น|กิ๊น/g, 'กิน')
    .replace(/(?:ยาม|ตอน)?(?:เซ้า|เจ๊า)|มื้อเช้า|หัวเช้า|หัวรุ่ง/g, 'ตอนเช้า')
    .replace(/(?:ยาม|ตอน)?แลง|มื้อแลง|หัวค่ำ|ยามค่ำ/g, 'ตอนเย็น')
    .replace(/จักโมง/g, 'กี่โมง')
    .replace(/เอ\s*เฮช\s*เอ|เอ\s*เอช\s*เอ/g, 'AHA')
    .replace(/(ยี่|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า)\s+สิบ/g, '$1สิบ')
    .replace(/สิบ\s+(เอ็ด|หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า)/g, 'สิบ$1')
    .replace(/\s+/g, ' ').trim();
}

function unpolite(value) {
  let text = value.trim();
  while (POLITE.test(text)) text = text.replace(POLITE, '').trim();
  return text;
}

export function thaiNumber(value) {
  const text = normalizeVoiceText(value).replace(/\s/g, '');
  if (/^\d{1,3}$/.test(text)) return Number(text);
  if (Object.prototype.hasOwnProperty.call(ONES, text)) return ONES[text];
  if (text.startsWith('ศูนย์') && Object.prototype.hasOwnProperty.call(ONES, text.slice(5))) return ONES[text.slice(5)];
  const match = text.match(/^(ยี่|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า)?สิบ(เอ็ด|หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า)?$/);
  return match ? (match[1] ? (match[1] === 'ยี่' ? 2 : ONES[match[1]]) : 1) * 10 + (ONES[match[2]] || 0) : null;
}

const missing = () => ({ status: 'missing', time: null });
// matchAll is unavailable on some older Android browsers supported by AHA.
function matchesOf(text, pattern) {
  const found = [];
  let match;
  while ((match = pattern.exec(text)) !== null) found.push(match);
  return found;
}
const invalid = () => ({ status: 'invalid', time: null, prompt: 'เวลายังไม่ชัดเจนค่ะ กรุณาบอกชั่วโมงและนาทีอีกครั้ง เช่น ตีหนึ่งสิบเอ็ดนาที หรือ 13:03' });
const ambiguous = () => ({ status: 'ambiguous', time: null, prompt: 'หมายถึงช่วงเช้าหรือช่วงบ่ายและเย็นคะ กรุณาบอกเวลาเต็ม เช่น ตีหนึ่ง หรือบ่ายโมง' });
function valid(hour, minute, start, end) {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) return invalid();
  return { status: 'valid', time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, start, end };
}

export function understandTime(rawText, baseTime = null) {
  let text = normalizeVoiceText(rawText);
  // Corrections supersede the earlier value, but never choose between two unqualified times.
  const correction = matchesOf(text, /(?:ไม่ใช่|แก้เป็น|เปลี่ยนเป็น)/g).pop();
  if (correction) text = text.slice(correction.index + correction[0].length).trim();
  if (!text) return missing();

  const relative = text.match(new RegExp(`(?:เลื่อน|ช้าลง|เร็วขึ้น)\\s*(?:เวลา)?\\s*(?:อีก|ไป|ออกไป)?\\s*(${NUMBER})\\s*นาที`));
  if (relative) {
    if (!baseTime) return { ...invalid(), prompt: 'ต้องการเลื่อนจากเวลากี่โมงคะ กรุณาบอกเวลาใหม่ให้ครบก่อนบันทึก' };
    const delta = thaiNumber(relative[1]);
    const [hour, minute] = baseTime.split(':').map(Number);
    const total = hour * 60 + minute + (/เร็วขึ้น/.test(relative[0]) ? -delta : delta);
    if (delta === null || total < 0 || total >= 1440) return { ...invalid(), prompt: 'เวลาที่เลื่อนข้ามวันค่ะ กรุณาบอกเวลาใหม่ให้ชัดเจนอีกครั้ง' };
    return valid(Math.floor(total / 60), total % 60, relative.index, relative.index + relative[0].length);
  }

  // Extract the full clock expression before validating, so 25:00 never becomes 5:00.
  const clocks = matchesOf(text, /(\d+)\s*[:.]\s*(\d+)/g);
  if (clocks.length > 1) return { ...ambiguous(), prompt: 'ได้ยินหลายเวลาค่ะ กรุณาบอกเวลาที่ต้องการเพียงเวลาเดียว' };
  if (clocks.length) {
    const match = clocks[0];
    if (/^\s*[:.]\s*\d/.test(text.slice(match.index + match[0].length))) return invalid();
    if (/โมง|ทุ่ม|นาฬิกา|เที่ยง|ตี\s*(?:\d|หนึ่ง|สอง|สาม|สี่|ห้า)/.test(text.replace(match[0], ''))) return { ...ambiguous(), prompt: 'ได้ยินหลายรูปแบบเวลาค่ะ กรุณาบอกเวลาเดียวให้ชัดเจนอีกครั้ง' };
    let hour = Number(match[1]);
    const period = text.slice(match.index + match[0].length).match(/^\s*(เช้า|เย็น|ค่ำ|บ่าย)/)?.[1];
    if (period && period !== 'เช้า' && hour >= 1 && hour < 12) hour += 12;
    return valid(hour, Number(match[2]), match.index, match.index + match[0].length);
  }

  const pattern = new RegExp(`เที่ยงคืน|เที่ยง|ตี\\s*(${NUMBER})|บ่าย\\s*(${NUMBER})?\\s*(?:โมง)?|(${NUMBER})\\s*ทุ่ม|(${NUMBER})\\s*โมง(?:\\s*(?:เช้า|เย็น|ค่ำ|บ่าย))?|(${NUMBER})\\s*นาฬิกา`, 'g');
  const matches = matchesOf(text, pattern);
  if (matches.length > 1) return { ...ambiguous(), prompt: 'ได้ยินหลายเวลาค่ะ กรุณาบอกเวลาที่ต้องการเพียงเวลาเดียว' };
  let match = matches[0];
  let hour;
  let needsPeriod = false;
  if (match) {
    if (match[0] === 'เที่ยงคืน') hour = 0;
    else if (match[0] === 'เที่ยง') hour = 12;
    else if (match[1]) {
      hour = thaiNumber(match[1]);
      if (hour < 1 || hour > 5) return invalid();
    } else if (match[0].startsWith('บ่าย')) {
      const value = match[2] ? thaiNumber(match[2]) : 1;
      if (value < 1 || value > 6) return invalid();
      hour = value + 12;
    } else if (match[3]) {
      const value = thaiNumber(match[3]);
      if (value < 1 || value > 6) return invalid();
      hour = (value + 18) % 24;
    } else if (match[4]) {
      hour = thaiNumber(match[4]);
      if (hour < 1 || hour > 12) return invalid();
      const evening = /เย็น|ค่ำ|บ่าย/.test(match[0]) || /ตอนเย็น|ตอนบ่าย/.test(text);
      const morning = /เช้า/.test(match[0]) || /ตอนเช้า/.test(text);
      if (evening && morning) return ambiguous();
      if (evening && hour < 12) hour += 12;
      needsPeriod = hour <= 6 && !morning && !evening;
    } else hour = thaiNumber(match[5]);
  } else {
    match = text.match(new RegExp(`(?:เวลา|ตอน)\\s*(${NUMBER})(?![0-9])`));
    if (!match) return /[:.]\s*\d|นาที|โมง|นาฬิกา|^ตี/.test(text) ? invalid() : missing();
    hour = thaiNumber(match[1]);
    needsPeriod = hour >= 1 && hour <= 12;
  }
  const tail = text.slice(match.index + match[0].length);
  const minutePart = tail.match(new RegExp(`^\\s*(?:กับ|และ|อีก)?\\s*(ครึ่ง|${NUMBER})\\s*(?:นาที)?`));
  const minute = minutePart ? (minutePart[1] === 'ครึ่ง' ? 30 : thaiNumber(minutePart[1])) : 0;
  if (minute === null || minute > 59 || (!minutePart && /^\s*(?:กับ|และ|อีก)?\s*\S*นาที/.test(tail))) return invalid();
  if (minutePart && new RegExp(`^\\s*(?:${NUMBER}|ครึ่ง|นาที)`).test(tail.slice(minutePart[0].length))) return invalid();
  if (needsPeriod) return ambiguous();
  return valid(hour, minute, match.index, match.index + match[0].length + (minutePart?.[0].length || 0));
}

export function isMedicalAdvice(text) {
  return /เพิ่มขนาดยา|ลดขนาดยา|ปรับขนาดยา|เพิ่มยา.*(?:ได้ไหม|ดีไหม|ดีมั้ย|เอง)|ลดยา|หยุดยา|เปลี่ยนยา(?!เตือน|ในรายการ)|ควรกิน|กิน.*กี่เม็ด|ทาน.*กี่เม็ด|วินิจฉัย|เป็นโรคอะไร|กินยาแทน/.test(text);
}

export function isEmergency(text) {
  return /ช่วยด้วย|ฉุกเฉิน|หายใจไม่ออก|เจ็บหน้าอก|โทร\s*1669|หกล้ม|ล้มลง|ล้มแล้ว|^ล้ม(?:ครับ|ค่ะ|คะ)?$/.test(text);
}

export function isCreateRequest(text) {
  return /(?:เตือน|ตั้ง|เพิ่ม|สร้าง|บันทึก).*(?:ยา|กิน|ทาน)|(?:ยา|กิน|ทาน).*เตือน/.test(text);
}

export function unsupportedSchedule(text) {
  return /พรุ่งนี้|มะรืน|เฉพาะวันนี้|ครั้งเดียว|วันเว้นวัน|รายสัปดาห์|ทุก(?:วัน)?(?:จันทร์|อังคาร|พุธ|พฤหัส|ศุกร์|เสาร์|อาทิตย์)|เฉพาะวัน|ทุก\s*\d+\s*ชั่วโมง/.test(text);
}

export function extractMedicineName(rawText) {
  let text = unpolite(normalizeVoiceText(rawText));
  text = text.replace(/^ไม่ใช่\s*/, '').replace(/^(?:(?:แก้|เปลี่ยน)(?:ชื่อยา|ชื่อ|ยา)?(?:เป็น)?\s*)/, '')
    .replace(/^(?:ช่วย\s*)?(?:ตั้ง|สร้าง|เพิ่ม|บันทึก)\s*(?:รายการ)?\s*(?:การ)?(?:แจ้ง)?(?:เตือน)?\s*(?:ให้)?\s*(?:ฉัน|ผม)?\s*/, '')
    .replace(/^(?:ช่วย\s*)?(?:การ)?(?:แจ้ง)?เตือน\s*(?:ให้)?\s*(?:ฉัน|ผม)?\s*/, '')
    .replace(/^(?:เวลา)?\s*(?:กิน|ทาน|รับประทาน)\s*/, '')
    .replace(/^(?:ชื่อยา|ชื่อ|ยา)\s*/, '');
  text = text.replace(/\s*(?:ทุกวัน|ทุก ๆ วัน|ประจำวัน).*$/, '');
  const time = understandTime(text);
  if (Number.isInteger(time.start)) text = text.slice(0, time.start);
  text = text.replace(/\s*(?:เวลา|ตอน|ช่วง|ตี|บ่าย)\s*.*$/, '');
  text = text.replace(new RegExp(`\\s*${NUMBER}\\s*(?:โมง|ทุ่ม|นาฬิกา).*`), '');
  text = unpolite(text);
  if (!text || /^(?:ยา|รายการ|รายการยา|ใหม่|ตอนเช้า|ตอนเย็น|เช้า|เย็น|ก่อนนอน|เปลี่ยนเป็น|ไม่ใช่)$/.test(text)) return null;
  if (/[:?？]|กี่โมง|ได้ไหม|อะไร|ยืนยัน|ยกเลิก|นาที/.test(text)) return null;
  return text.length <= 120 ? text : null;
}

export function isConfirmation(rawText) {
  return /^(?:ใช่|ใช่แล้ว|ถูกต้อง|ถูกแล้ว|ตกลง|ยืนยัน|ยืนยันบันทึก|บันทึกเลย|ทำเลย)$/.test(unpolite(normalizeVoiceText(rawText)));
}

export function pendingTurn(rawText, command) {
  const text = unpolite(normalizeVoiceText(rawText));
  if (/^(?:ไม่เอา|ยกเลิก|หยุดก่อน|พอก่อน|ไม่ทำแล้ว)$/.test(text)) return { action: 'cancel' };
  if (text === 'ไม่ใช่') return { action: 'reply', prompt: 'ต้องการแก้ชื่อยาหรือเวลาคะ บอกรายละเอียดที่ถูกต้องได้เลย' };
  if (command.stage === 'confirming' && isConfirmation(text)) return { action: 'confirm', command };
  const time = understandTime(text, command.reminder_time);
  if (time.status === 'invalid' || time.status === 'ambiguous') {
    return { action: 'clarify', command: { ...command, reminder_time: null, stage: 'collecting', missing: 'reminder_time' }, prompt: time.prompt };
  }
  const medicine = command.missing === 'medicine_name' || /ยา|เปลี่ยนชื่อ|แก้ชื่อ/.test(text) ? extractMedicineName(text) : null;
  if (!medicine && !time.time) return { action: 'reply', prompt: command.missing === 'medicine_name' ? 'กรุณาบอกชื่อยาที่ต้องการให้เตือนค่ะ' : 'บอกเวลาใหม่ ชื่อยา หรือพูดว่า ยืนยัน หรือ ยกเลิก ได้เลยค่ะ' };
  return { action: 'update', command: { ...command, medicine_name: medicine || command.medicine_name, reminder_time: time.time || command.reminder_time } };
}
