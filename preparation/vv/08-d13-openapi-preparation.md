# D13 — ปรับตามโจทย์ฉบับเต็มที่ได้รับ

กำหนดส่ง 9 ก.พ. 2570 13:00 · ตรวจรวม CP4 · Working draft

## ข้อกำหนดที่อาจารย์ระบุ
กำหนดลำดับการรวม; ทดสอบ API ตาม openapi.yaml ทั้ง normal/error (Postman/Newman เป็นตัวอย่าง ไม่บังคับเครื่องมือเฉพาะ); เก็บ tests/integration/; ข้อบกพร่องจริงเปิด issue พร้อมป้าย ขั้นตอนทำซ้ำ expected/actual; รันซ้ำได้. ร่างเดิม 06 มี 15 กลุ่ม test design; ใช้ฉบับนี้เสริมเรื่อง contract และลำดับการรวม

## ลำดับรวมที่เสนอ (incremental bottom-up)
1. DB migrations และ seed ทั้ง 3 ฐาน; verify referential integrity
2. Auth (identity/session) + DB; Auth HTTP ปกติ/ผิดพลาด
3. Reminder + Auth + DB; ownership/CRUD/scheduler/consent
4. Notification + Auth + DB; owner, spoof protection, SOS และ mock local event; ไม่เปิด push/pิกัดจริง
5. Gateway + ทั้งสามบริการ; ทำ end-to-end HTTP และตรวจผลข้างเคียง DB; system/UAT/NFR ต่อใน CP4 ตามโจทย์

## Contract
ไม่พบ openapi.yaml ใน main ณ baseline d78e060. ร่าง [openapi.yaml](d12-d13/openapi.yaml) เป็น JSON ซึ่งเป็น YAML subset ที่อ่านได้ด้วย OpenAPI tooling; สร้างจาก routes/controllers ที่ตรวจจริง (auth login, reminder, caregiver, notification, Academic guards) ยังไม่ใช่ full API contract. ต้องตรวจ schema/error code/auth ของทุก endpoint ใน scope หลัง CP1/CP3; ไม่เปลี่ยน runtime เพื่อให้ตรงร่าง. Postman/Newman เป็นทางเลือก; ร่างนี้ใช้ Node HTTP runner โดยอ่าน contract และยืนยันว่า expected status ถูกประกาศไว้ใน spec พร้อม assertion เชิงธุรกิจ. ไม่ใช่ full schema validation และยังไม่ได้รัน.

## ไฟล์เตรียม
- [fixture](d12-d13/fixtures.json), [seed](d12-d13/seed.py), [OpenAPI subset](d12-d13/openapi.yaml), [API smoke runner](d12-d13/api-smoke.cjs)
- Test data plan: [07-test-data-plan.md](07-test-data-plan.md)
- Runner มี positive และ negative สำหรับ login, reminder list/CRUD/invalid time/IDOR, caregiver role/link, notification owner/spoof, Academic SOS location rejection/push disabled. รันใน generated internal network เท่านั้น. ผล Not run; ยังต้องเพิ่ม real SOS positive/recipient, consent revoke, idempotency, scheduler, audit และ DB side-effect checks เมื่อขอบเขตลงตัว
- Workflow เดิมเรียก ci/isolated-family-idor.cjs และ ci/isolated-notification-sos.cjs ที่ไม่มีบน Academic; อย่าคัดลอกโดยไม่ตรวจความปลอดภัย/ความเข้ากันได้. ร่าง runner ใหม่ไม่อ้างว่าซ่อม Workflow เดิมแล้ว

## Evidence/defect workflow
บันทึก commit SHA, environment, seed project/fixture version, test ID/requirement ID, คำสั่ง, expected/actual, status, เวลา, log ที่ redact แล้ว. เมื่อพบข้อบกพร่องจริง เปิด GitHub Issue พร้อม type:defect + severity หนึ่งระดับ, reproduction, expected, actual, baseline, evidence, owner/retest. แยก infrastructure blocker จาก defect. ไม่เปิด issue สมมติหรืออ้างผล Pass ก่อนรัน. จัดเก็บไฟล์จริงใน tests/integration/ เมื่อครบเงื่อนไข; ยังไม่สร้างตำแหน่งส่งงานบน main.

## สิ่งที่ต้องปิดก่อน CP4
ยืนยัน openapi ฉบับเต็ม, test cases และ RTM, fixture run ซ้ำได้, ผล HTTP จริง, issue ที่พบจริง. CP4 ยังต้อง integration, system, UAT และ NFR ทั้งหมดตามคำสั่งอาจารย์ ไม่ใช้ smoke runner นี้แทนทุกระดับ.
