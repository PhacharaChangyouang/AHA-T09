'use strict';
// Local development only. Reject implicit libpq environment fallbacks and remote URLs.
function academicDbConfig(service, env = process.env) {
  const ports = { auth: 5433, reminder: 5434, notification: 5435 };
  if (!Object.hasOwn(ports, service)) throw new Error('Unknown academic DB service');
  const hosts = ['localhost', '127.0.0.1', service + '-db', 'aha-' + service + '-db'];
  let host, port, database, user, password;
  if (env.DATABASE_URL) {
    let url;
    try { url = new URL(env.DATABASE_URL); } catch { throw new Error('Invalid academic database URL'); }
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.search || url.hash || !url.username || !url.password) throw new Error('Invalid academic database URL');
    host = url.hostname;
    port = Number(url.port || 5432);
    database = decodeURIComponent(url.pathname.slice(1));
    user = decodeURIComponent(url.username);
    password = decodeURIComponent(url.password);
  } else {
    host = env.DB_HOST;
    port = Number(env.DB_PORT || 5432);
    database = env.DB_NAME;
    user = env.DB_USER;
    password = env.DB_PASSWORD || env.POSTGRES_PASSWORD;
  }
  if (!hosts.includes(host) || ![5432, ports[service]].includes(port) ||
      !/^(?:aha_[a-z0-9_]*|auth_db|reminder_db|notification_db)$/.test(database || '') ||
      (database.endsWith('_db') && ['auth_db','reminder_db','notification_db'].includes(database) && database !== service + '_db') ||
      !/^[a-zA-Z0-9_]+$/.test(user || '') || typeof password !== 'string' || !password) {
    throw new Error('Academic database must use explicit local synthetic configuration');
  }
  return { host, port, database, user, password };
}
module.exports = { academicDbConfig };
