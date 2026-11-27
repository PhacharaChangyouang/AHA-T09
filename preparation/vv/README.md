# T09 — เตรียมงาน V&V ตามรายวิชา ENGSE601

> T09 · 27 พ.ย. 2569 · ฉบับเตรียมงาน (ยังไม่ใช่งานส่งและไม่ใช่ผลทดสอบ) · baseline `ac69042fc88a1b2452c242c4dbf6c9c70ef48560`

เก็บแยกจาก main และไม่ใช้ชื่อโฟลเดอร์ส่งงาน CP เพื่อป้องกันระบบตรวจอัตโนมัตินับงานก่อนเสร็จ เอกสารทั้งหมดเป็นข้อเสนอสำหรับทีมตรวจ ไม่ใช่การอนุมัติของสมาชิกหรืออาจารย์

| เอกสาร | วัตถุประสงค์ |
|---|---|
| [SRS self-inspection](01-srs-self-inspection.md) | ตรวจ D07 ตาม checklist 13 ข้อ และเตรียม CP1 |
| [SDD preliminary review](02-sdd-preliminary-review.md) | ตรวจแม่แบบ 12 ข้อ และความต่าง Academic |
| [Master Test Plan draft](03-master-test-plan-draft.md) | เตรียม CP2 ตาม V&V Strategy |
| [Requirement/test design matrix](04-requirement-test-design.md) | เตรียม CP3: 64 รายการ, Given–When–Then และกรณีทดสอบย่อย |
| [Existing test inventory](05-existing-test-inventory.md) | รายการไฟล์ทดสอบที่มีจริง แยกอ่าน source กับรันทดสอบ |
| [D13 Integration/API preparation](06-d13-integration-api-preparation.md) | ตรวจหลักฐานเดิม สคริปต์ที่ขาด และร่างกรณีทดสอบก่อนถึงกำหนด |

## เกณฑ์ก่อนส่งจริง
- D07: ตรวจและรับรอง SRS 1.0 ทั้ง Word/PDF, ที่มาและความสำคัญรายข้อ, ปิดหรือกำหนดผู้รับผิดชอบ/วันตัดสิน TBD; ตรวจ tag ที่อ้าง baseline เดิมก่อนเปลี่ยนโดยตกลงกับอาจารย์
- CP1: ต้องมีผล inspection ไขว้ทีมทั้งที่ตรวจและได้รับ, issue จริง, revision 1.1 และ tag ตามโจทย์; ไม่ใช้การตรวจภายในแทน
- SDD: ต้องอิง SRS หลัง CP1 และตรวจตามโจทย์ครั้งที่ 4
- CP2/CP3: ยังไม่เห็นโจทย์และแม่แบบฉบับเต็ม; ใช้ร่างในชุดนี้เทียบแม่แบบเมื่อได้รับ
- CP4/CP5: รันทดสอบจริงบน Academic ที่แยกออกจาก Production และจัดทำผลตามหลักฐาน ไม่ให้ผ่านจากชื่อไฟล์หรือกรณีทดสอบที่ยังไม่รัน
- D09/D10/D11/D13/D15: รอคำสั่งรายงานเต็มก่อนกำหนดตำแหน่งและชื่อไฟล์

## แหล่งข้อมูล
- [V&V Profile](../../docs/vv/00-vv-profile.md), [V&V Strategy](../../docs/vv/02-vv-strategy.md), [SE02](../../docs/srs/proposal.pdf), [SRS Word](../../docs/srs/SRS-T09.docx), [SRS PDF](../../docs/srs/SRS-T09.pdf), [SDD PDF](../../docs/design/SDD-T09.pdf)
- ENGSE601-SRS-template.docx หน้า 26, ENGSE601-SDD-template.docx หน้า 22, คู่มือเขียน SRS และเอกสารออกแบบจากแบบเสนอโครงงาน (Library)
- SDD-v0.2.docx ใน Library: ใช้ทบทวนร่างเท่านั้น ยังไม่ยืนยันว่าเนื้อหาตรงกับ SDD PDF ใน repo ทุกหน้า
- SRS Word ที่ตรวจตรงกับ Git blob 4fb264d700562b325e7af3e9e92c6591658b4d23; tag srs-v1.0 ยังชี้ bef86e9ead20b89d706df1402f053958a016cadd

ไม่เผยแพร่ข้อมูลผู้ตอบ SUS รายบุคคล, ข้อมูลสุขภาพจริง, credential, log ภายใน หรือรายละเอียด Production เพิ่มเติม Branch นี้อยู่ใน repo Public จึงเก็บเฉพาะข้อมูลวิชาการและผลตรวจเอกสารที่ไม่เพิ่มข้อมูลอ่อนไหว

## เพิ่มเติมหลังได้รับโจทย์ Test Data / D13 ฉบับเต็ม
- [Test data plan](07-test-data-plan.md) + fixture/seed draft
- [D13 OpenAPI preparation](08-d13-openapi-preparation.md) + contract subset / HTTP runner
- ยังไม่ใช่งานส่ง: ไม่มี Docker/PostgreSQL/HTTP execution evidence; เก็บใน preparation เท่านั้น

## Test reuse preparation
- [Test reuse matrix](09-test-reuse-matrix.md): aggregate comparison and requirement mapping.
- [Historical evidence handling](10-historical-evidence-handling.md): restricted evidence and academic rerun rules.
- Extended fixture-based HTTP runner and draft OpenAPI; not executed.
