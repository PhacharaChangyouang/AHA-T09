export const REMINDER_CHANGE_EVENT = 'aha-reminders-refresh';
export const REMINDER_CHANGE_CHANNEL = 'aha-reminders-change';

export function publishReminderChange(detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(REMINDER_CHANGE_EVENT, { detail }));
  // Only invalidation metadata crosses tabs; no medication or account data.
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(REMINDER_CHANGE_CHANNEL);
      channel.postMessage({ action: detail.action, reminderId: detail.reminderId });
      channel.close();
    }
  } catch (_) {}
}

export async function reminderMutation(operation, action, reminderId) {
  const result = await operation;
  publishReminderChange({ action, reminderId: reminderId || result?.data?.reminder_id || result?.data?.id });
  return result;
}

export function isActionableReminder(reminder, now = Date.now()) {
  return Boolean(reminder && reminder.is_active !== false && !reminder.taken && !reminder.completed && !reminder.is_taken &&
    !(reminder.snooze_until && new Date(reminder.snooze_until).getTime() > now));
}

export async function completeReminderAlert(action, notification, { reminderApi, notificationApi }) {
  let unavailable = false;
  try {
    if (action === 'taken') await reminderApi.markTaken(notification.related_id);
    else if (action === 'snooze') await reminderApi.snooze(notification.related_id, 10);
  } catch (error) {
    if (error?.status !== 404) throw error;
    unavailable = true;
    publishReminderChange({ action: 'removed', reminderId: notification.related_id });
  }
  // A notification acknowledgement must never turn a saved dose into a failed dose.
  try { await notificationApi.markRead(notification.id); } catch (_) {}
  return { unavailable };
}
