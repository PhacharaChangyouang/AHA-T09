'use strict';
const localOrigins = {
  AUTH_SERVICE_URL: ['http://localhost:3001', 'http://127.0.0.1:3001', 'http://auth-service:3001', 'http://aha-auth-service:3001'],
  REMINDER_SERVICE_URL: ['http://localhost:3002', 'http://127.0.0.1:3002', 'http://reminder-service:3002', 'http://aha-reminder-service:3002'],
  NOTIFICATION_SERVICE_URL: ['http://localhost:3003', 'http://127.0.0.1:3003', 'http://notification-service:3003', 'http://aha-notification-service:3003'],
};
function assertAcademicEnvironment(env = process.env) {
  for (const [key, allowed] of Object.entries(localOrigins)) {
    if (env[key] && !allowed.includes(env[key])) throw new Error('Non-local academic service origin: ' + key);
  }
  if (env.FRONTEND_URL && !/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::[0-9]{1,5})?$/.test(env.FRONTEND_URL)) throw new Error('Non-local academic frontend origin');
  for (const key of ['RESEND_API_KEY', 'MAIL_FROM', 'SUPPORT_EMAIL', 'SUPPORT_FROM_EMAIL', 'VAPID_PRIVATE_KEY', 'VAPID_PUBLIC_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_SIGNUP_SECRET', 'WORKSPACE_SPONSOR_EVENT_KEY', 'RAILWAY_TOKEN', 'RAILWAY_ENVIRONMENT_ID', 'RAILWAY_PROJECT_ID', 'AHA_RCLONE_CONFIG_B64']) {
    if (env[key]) throw new Error('External provider or production configuration not allowed: ' + key);
  }
  for (const key of ['CAREGIVER_REPORT_EMAIL_ENABLED', 'PIN_RECOVERY_NOTICES_ENABLED', 'AHA_ALLOW_LIVE_PG_DUMP']) {
    if (env[key] === 'true') throw new Error('External side effects not allowed: ' + key);
  }
}
module.exports = { assertAcademicEnvironment };
