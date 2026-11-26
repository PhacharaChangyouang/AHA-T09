// Academic-only: no outbound email provider or real recipient delivery.
// Recovery UI can be tested separately with synthetic fixtures; do not report delivery.
async function unavailable() {
  throw new Error('Email delivery disabled in Academic Edition');
}
module.exports = {
  sendPasswordResetEmail: unavailable,
  sendAccountSecurityNotice: unavailable,
  sendPinResetEmail: unavailable,
};
