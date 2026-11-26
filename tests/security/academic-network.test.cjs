const test = require('node:test');
const assert = require('node:assert/strict');
const { assertAcademicEnvironment } = require('../../backend/auth-service/src/config/academic-network');
test('local development configuration is accepted', () => {
  assert.doesNotThrow(()=>assertAcademicEnvironment({AUTH_SERVICE_URL:'http://aha-auth-service:3001',NOTIFICATION_SERVICE_URL:'http://127.0.0.1:3003',FRONTEND_URL:'http://localhost:3000'}));
});
test('remote origins and port mismatch rejected', () => {
  for(const env of [{AUTH_SERVICE_URL:'https://example.invalid'},{AUTH_SERVICE_URL:'http://localhost:3002'},{FRONTEND_URL:'https://example.invalid'},{NOTIFICATION_SERVICE_URL:'http://localhost:3003@evil.invalid'}]) assert.throws(()=>assertAcademicEnvironment(env));
});
test('external provider credentials and live delivery flags rejected', () => {
  for(const env of [{RESEND_API_KEY:'fixture'},{VAPID_PRIVATE_KEY:'fixture'},{GOOGLE_CLIENT_ID:'fixture'},{RAILWAY_TOKEN:'fixture'},{CAREGIVER_REPORT_EMAIL_ENABLED:'true'},{PIN_RECOVERY_NOTICES_ENABLED:'true'}]) assert.throws(()=>assertAcademicEnvironment(env));
});
