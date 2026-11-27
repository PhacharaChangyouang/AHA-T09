# Existing test inventory — static inspection

> T09 · 27 พ.ย. 2569 · ฉบับเตรียมงาน (ยังไม่ใช่งานส่งและไม่ใช่ผลทดสอบ) · baseline `ac69042fc88a1b2452c242c4dbf6c9c70ef48560`

ตารางด้านล่างแยกสิ่งที่อ่านชื่อกรณีทดสอบจากสิ่งที่พบชื่อไฟล์เท่านั้น. ไม่ได้รัน, ไม่ยืนยัน coverage, ไม่ได้ทดสอบ HTTP จริง. ใช้ตรวจ mapping กับไฟล์ 04 และเตรียม CP3

## อ่าน source ของกรณีทดสอบตัวอย่างแล้ว
| ไฟล์ | สิ่งที่ตรวจพบในชื่อ test / source | เชื่อมข้อกำหนดเสนอ | ข้อจำกัด |
|---|---|---|---|
| frontend/tests/voice-understanding.test.mjs | exact time, invalid, ambiguity, correction, confirmation, cancel, missing name/time, dosage advice | FR-08.01–03, FR-10.03–04, NFR-07 | parser ไม่ใช่เสียงบน device หรือการเขียน DB จริง |
| backend/reminder-service/tests/scheduler-date.test.js | today DATE/ISO, future start, expired end, unbounded, weekday | FR-03.01, NFR-03 | ไม่ได้วัด device delivery |
| backend/auth-service/tests/family-connection-security.test.js | ลบเฉพาะ participant, ไม่เปิดเผย/ลบ connection คนอื่น | FR-07.03–04, NFR-05 | ไม่แทน accept/revoke ครบทุก API |
| backend/reminder-service/tests/audit-idor-20261016.test.js | unlinked caregiver create/delete ไม่ได้, summary เฉพาะ linked | FR-01.03, FR-05.01/03, DR-02, NFR-05 | ตรวจสิทธิ์บางเส้นทาง |
| backend/notification-service/tests/security.test.js | ปฏิเสธ spoof, malformed ID, invalid coordinates, invalid JWT, arbitrary push endpoint | FR-01.03, FR-09, SI-01, NFR-05 | Academic delivery disabled |
| tests/security/academic-sos.test.cjs | message-only ไม่ส่งพิกัด; ปฏิเสธ valid/invalid/null/string location | FR-09.02/05, SI-03 | ทดสอบ guard เท่านั้น ไม่ใช่ live SOS delivery |
| tests/security/academic-db.test.cjs | explicit local config, ปฏิเสธ remote/cross-service/query override | DR-04, NFR-05 | ไม่ใช่ restore test |
| tests/security/academic-network.test.cjs | local origin ผ่าน, remote/port mismatch/credential/live delivery ถูกปฏิเสธ | DR-04, SI-01, NFR-05 | ไม่ใช่ runtime penetration test |
| tests/security/scheduler-guard.test.cjs | overlap, failure release, deadline/redirect/stalled response | FR-03, NFR-03 | ไม่ยืนยัน event idempotency ใน DB |
| backend/auth-service/tests/session-revocation.test.js | revoke/stale account before JWT expiry, logout/session, rollback เมื่อ DB fail | FR-01.01/03, NFR-05 | session revoke ต่างจาก caregiver consent revoke |
| backend/notification-service/tests/retention.test.js | expired-only bounded batches, cap, retry/stop/no overlap | DR-03 | policy retention ยัง TBD-05 |
| mobile_app/test/sos_screen_test.dart | pending จน API ยืนยัน, error ไม่ fake success, empty result ไม่ success | FR-09.06, UI-03 | Native นอก SRS ปัจจุบัน; เสริมเท่านั้น |

## รายการอื่นที่พบใน Git tree (ยังไม่อ่าน assertions ทั้งหมด)
Auth: attack-matrix-20261017, audit-20261016, audit-bcrypt-20261016, error-log-privacy, internal-recipient-rate-limit, migration-pin-safety, password-reset-rate-limit, pin-security, profile-security, registration-security, token-security, urgent-auth-hardening (ทุกชื่ออยู่ใน backend/auth-service/tests/ และลงท้าย .test.js).
Reminder: security.test.js, session-revocation.test.js. Notification: session-revocation.test.js. Frontend: academic-origin.test.mjs, academic-sponsor-pwa.test.mjs, lint-toolchain.test.mjs. Mobile: widget_test.dart.
พบ workflow: aha-ci-security-guard, aha-family-idor-postgres, aha-flutter-android-ci, aha-github-security-baseline, aha-isolated-schema-restore, aha-notification-sos-postgres, aha-trust-seo-gate, security-regression. ชื่อ workflow ไม่ใช่หลักฐานว่า job ผ่าน

## แผนรันเมื่อพร้อม (ตรวจ scripts และ environment ก่อน)
- Frontend: จาก frontend ใช้ npm ci หาก lockfile/Node ตรง แล้ว npm run test:voice; ตรวจ npm run lint ตาม manifest
- Backend: จากแต่ละ service ใช้ npm ci แล้ว npm test ตาม scripts Jest; อ่าน setup และ mock/DB config ก่อนทุกครั้ง ไม่ชี้ production
- Root security tests: ตรวจ runner/fixture แล้วใช้ node --test กับไฟล์ .cjs ที่เข้ากันได้ตาม source; แยก test ที่ต้อง service/DB
- DB integration / restore: ใช้ compose และ fixture local; อ่าน workflow ฉบับจริงก่อนรัน; restore ลงฐานจำลองใหม่เท่านั้น
- เก็บ stdout, exit code, runtime, commit, test titles และ coverage ที่วัดได้; redact หลักฐาน; สร้าง issue เฉพาะ defect ที่พบจริง

## ช่องว่างที่ต้องเติม
- CRUD/medication state/idempotency, edit schedule cancel old event, notification recipient and delivery, caregiver consent acceptance/revoke, audit log/field rights
- Web SOS UI error path; location/push live อยู่ภายนอก Academic baseline ที่อนุญาต
- WCAG/device matrix, full speech accuracy, task success/time on task และ UAT consent
- Restore trial ที่มี checksum/count, latency measurement, provider contract และ NFR measurement ที่กำหนด oracle ชัดเจน

สถานะหลักฐาน: มีไฟล์ test และบางส่วนได้อ่าน source แต่ยังไม่มีผลรันจาก baseline นี้ในชุดเตรียมงาน. ห้ามระบุ Passed หรืออ้างว่า covered 100%
