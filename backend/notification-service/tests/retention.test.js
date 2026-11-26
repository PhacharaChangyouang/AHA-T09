const { retentionDays, removeExpiredNotifications, startNotificationRetention } = require('../src/retention');

describe('notification retention', () => {
  test.each([[undefined, 15], ['7', 7], ['15', 15], ['0', 15], ['-1', 15], ['1; DROP TABLE users', 15]])('uses a bounded retention policy for %s', (input, expected) => {
    expect(retentionDays(input)).toBe(expected);
  });

  test('deletes only expired notifications in bounded locked batches', async () => {
    const pool = { query: jest.fn().mockResolvedValueOnce({ rowCount: 1000 }).mockResolvedValueOnce({ rowCount: 3 }) };
    expect(await removeExpiredNotifications(pool, 15)).toBe(1003);
    expect(pool.query).toHaveBeenCalledTimes(2);
    const [sql, values] = pool.query.mock.calls[0];
    expect(values).toEqual([15, 1000]);
    expect(sql).toMatch(/DELETE FROM notifications n/);
    expect(sql).toMatch(/created_at < now\(\)/);
    expect(sql).toMatch(/COALESCE\(delivered_at, created_at\)/);
    expect(sql).toMatch(/scheduled_at IS NULL OR scheduled_at </);
    expect(sql).toMatch(/FOR UPDATE SKIP LOCKED/);
    expect(sql).not.toMatch(/push_subscriptions|reminder_logs|refresh_tokens/);
  });

  test('caps one cleanup pass so a large history cannot monopolize the database', async () => {
    const pool = { query: jest.fn().mockResolvedValue({ rowCount: 1000 }) };
    expect(await removeExpiredNotifications(pool, 7)).toBe(10000);
    expect(pool.query).toHaveBeenCalledTimes(10);
    expect(pool.query.mock.calls[0][1][0]).toBe(7);
  });

  test('starts immediately, avoids overlapping runs, retries after errors and stops', async () => {
    let tick, reject;
    const timer = { unref: jest.fn() };
    const timers = { setInterval: jest.fn(fn => { tick = fn; return timer; }), clearInterval: jest.fn() };
    const pool = { query: jest.fn().mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; })).mockResolvedValue({ rowCount: 0 }) };
    const logger = { info: jest.fn(), error: jest.fn() };
    const stop = startNotificationRetention(pool, { days: '15', timers, logger });
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(timers.setInterval).toHaveBeenCalledWith(expect.any(Function), 3600000);
    await tick(); expect(pool.query).toHaveBeenCalledTimes(1);
    reject(new Error('private fixture details'));
    await new Promise(resolve => setImmediate(resolve));
    expect(logger.error).toHaveBeenCalledWith('Notification retention failed; retrying at the next hourly run');
    await tick(); expect(pool.query).toHaveBeenCalledTimes(2);
    stop(); await tick(); expect(pool.query).toHaveBeenCalledTimes(2);
    expect(timers.clearInterval).toHaveBeenCalledWith(timer);
  });
});
