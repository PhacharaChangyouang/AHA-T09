const test = require('node:test');
const assert = require('node:assert/strict');
const { academicDbConfig } = require('../../backend/auth-service/src/config/academic-db');
test('local explicit config only', () => {
  assert.deepEqual(academicDbConfig('auth',{DB_HOST:'auth-db',DB_NAME:'auth_db',DB_USER:'fixture',DB_PASSWORD:'synthetic'}),{host:'auth-db',port:5432,database:'auth_db',user:'fixture',password:'synthetic'});
});
test('synthetic local URL is converted to explicit connection fields', () => {
  assert.equal(academicDbConfig('reminder',{DATABASE_URL:'postgres://fixture:synthetic@127.0.0.1:5434/aha_reminder_ci'}).port,5434);
});
test('remote, implicit, cross-service and query override inputs rejected', () => {
  for(const env of [{},{DATABASE_URL:'postgres://fixture:synthetic@db.example.invalid/aha_ci'},{DATABASE_URL:'postgres://fixture:synthetic@localhost/aha_ci?host=db.example.invalid'},{DATABASE_URL:'postgres://fixture:synthetic@localhost/reminder_db'},{DB_HOST:'notification-db',DB_NAME:'auth_db',DB_USER:'fixture',DB_PASSWORD:'synthetic'},{DB_HOST:'localhost',DB_NAME:'auth_db',DB_USER:'fixture',DB_PASSWORD:'synthetic',DB_PORT:'5434'}]) assert.throws(()=>academicDbConfig('auth',env));
});
