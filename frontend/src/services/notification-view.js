// Presentation only: all timestamps are grouped in AHA's Thailand time zone.
const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' });
const labelFormatter = new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'long' });
export function notificationTimestamp(value) {
  const timestamp = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(timestamp) ? timestamp : null;
}
export function groupNotifications(items, filter = 'all', now = new Date()) {
  const today = dayFormatter.format(now);
  const yesterday = dayFormatter.format(new Date(now.getTime() - 86400000));
  const groups = new Map();
  const rows = items.filter(item => filter !== 'unread' || !item.is_read)
    .slice().sort((a, b) => (notificationTimestamp(b.created_at) ?? -Infinity) - (notificationTimestamp(a.created_at) ?? -Infinity));
  for (const item of rows) {
    const timestamp = notificationTimestamp(item.created_at);
    const date = timestamp === null ? null : new Date(timestamp);
    const key = date ? dayFormatter.format(date) : 'unknown';
    const label = key === today ? 'วันนี้' : key === yesterday ? 'เมื่อวาน' : date ? labelFormatter.format(date) : 'ไม่ระบุวันที่';
    if (!groups.has(key)) groups.set(key, { key, label, items: [] });
    groups.get(key).items.push(item);
  }
  return Array.from(groups.values());
}
export function notificationTime(value) {
  const timestamp = notificationTimestamp(value);
  return timestamp === null ? '' : new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp));
}
