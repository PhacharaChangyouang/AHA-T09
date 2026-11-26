// Academic-only fixed origins. No arbitrary upstream URL configuration.
const SERVICES = Object.freeze({
  auth: ['http://127.0.0.1:3001', 'http://localhost:3001', 'http://auth-service:3001', 'http://aha-auth-service:3001'],
  reminder: ['http://127.0.0.1:3002', 'http://localhost:3002', 'http://reminder-service:3002', 'http://aha-reminder-service:3002'],
  notification: ['http://127.0.0.1:3003', 'http://localhost:3003', 'http://notification-service:3003', 'http://aha-notification-service:3003'],
});
export function academicServiceOrigin(service, value) {
  if (!Object.hasOwn(SERVICES, service)) return '';
  const origin = value || SERVICES[service][0];
  return SERVICES[service].includes(origin) ? origin : '';
}
export function academicFrontendOrigin(value) {
  const origin = value || 'http://localhost:3000';
  return /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::[0-9]{1,5})?$/.test(origin) ? origin : '';
}
