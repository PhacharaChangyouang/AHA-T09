// A single policy for registration, password reset, and password changes.
// bcrypt truncates beyond 72 UTF-8 bytes. Minimum 12 bytes matches the readiness specification.
const PASSWORD_MESSAGE = 'รหัสผ่านต้องมีขนาด 12–72 ไบต์ และมีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข';
function isValidPassword(value) {
  if (typeof value !== 'string') return false;
  const bytes = Buffer.byteLength(value, 'utf8');
  return bytes >= 12 && bytes <= 72 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);
}
module.exports = { isValidPassword, PASSWORD_MESSAGE };
