// Summaries describe today's scheduled doses, not a person's connection status.
export function medicationTaken(item) {
  return item.taken === true || item.completed === true || item.is_taken === true || item.log_status === 'taken';
}

export function medicationDue(item, now = new Date()) {
  const clock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
  return /^\d{2}:\d{2}/.test(String(item.reminder_time || '')) && String(item.reminder_time).slice(0, 5) <= clock;
}

export function personMedicationStatus(rows, now = new Date()) {
  if (!rows.length) return { tone: 'later', label: 'วันนี้ไม่มีรายการยา' };
  const taken = rows.filter(medicationTaken).length;
  if (taken === rows.length) return { tone: 'done', label: 'ทานครบแล้ว' };
  if (rows.some(row => !medicationTaken(row) && medicationDue(row, now))) return { tone: 'wait', label: `รอยืนยัน ${rows.filter(row => !medicationTaken(row) && medicationDue(row, now)).length} รายการ` };
  return { tone: 'later', label: taken ? `ทานแล้ว ${taken}/${rows.length} · ที่เหลือยังไม่ถึงเวลา` : 'ยังไม่ถึงเวลาทานยา' };
}
