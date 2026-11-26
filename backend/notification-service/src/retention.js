const BATCH_SIZE = 1000;
const MAX_BATCHES = 10;
const INTERVAL_MS = 60 * 60 * 1000;

function retentionDays(value) {
  return String(value) === '7' ? 7 : 15;
}

async function removeExpiredNotifications(pool, days) {
  const keepDays = retentionDays(days);
  let removed = 0;
  for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
    const result = await pool.query(`
      WITH expired AS (
        SELECT id FROM notifications
        WHERE created_at < now() - ($1::int * interval '1 day')
          AND COALESCE(delivered_at, created_at) < now() - ($1::int * interval '1 day')
          AND (scheduled_at IS NULL OR scheduled_at < now() - ($1::int * interval '1 day'))
        ORDER BY created_at
        LIMIT $2
        FOR UPDATE SKIP LOCKED
      )
      DELETE FROM notifications n USING expired
      WHERE n.id = expired.id
    `, [keepDays, BATCH_SIZE]);
    const count = result.rowCount || 0;
    removed += count;
    if (count < BATCH_SIZE) break;
  }
  return removed;
}

function startNotificationRetention(pool, { days = process.env.NOTIFICATION_RETENTION_DAYS, logger = console, timers = globalThis } = {}) {
  const keepDays = retentionDays(days);
  let running = false;
  let stopped = false;
  const run = async () => {
    if (running || stopped) return;
    running = true;
    try {
      const removed = await removeExpiredNotifications(pool, keepDays);
      logger.info(`Notification retention: keep ${keepDays} days, removed ${removed}`);
    } catch (_) {
      // Do not log row contents, subscription keys, SQL connection strings or PII.
      logger.error('Notification retention failed; retrying at the next hourly run');
    } finally { running = false; }
  };
  const timer = timers.setInterval(run, INTERVAL_MS);
  if (timer && typeof timer.unref === 'function') timer.unref();
  void run();
  return () => { stopped = true; timers.clearInterval(timer); };
}

module.exports = { retentionDays, removeExpiredNotifications, startNotificationRetention };
