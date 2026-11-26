const email = require('./email.service');
const security = require('./login-security.service');

async function notify(user, event, req) {
  // Destination comes exclusively from the stored account, never request input.
  if (!user.email) return;
  try {
    await email.sendAccountSecurityNotice({ to: user.email, event });
    await security.audit('account_security_notice_sent', { userId: user.id, success: true, req, metadata: { event } });
  } catch (_) {
    // A delivery failure must not undo or misreport a committed credential change.
    await security.audit('account_security_notice_failed', { userId: user.id, success: false, req, metadata: { event } });
  }
}
module.exports = { notify };
