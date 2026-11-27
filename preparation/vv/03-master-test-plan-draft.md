# CP2 — Master Test Plan (working draft)

> T09 · 27 พ.ย. 2569 · ฉบับเตรียมงาน (ยังไม่ใช่งานส่งและไม่ใช่ผลทดสอบ) · baseline `ac69042fc88a1b2452c242c4dbf6c9c70ef48560`

อ้างอิง V&V Profile ข้อ 5, V&V Strategy หัวข้อ 1–5, SRS Word บท 3–7 และ SDD ร่าง; ใช้คู่มือ ENGSE601 ที่ระบุ CP2 เป็น Master Test Plan แต่ยังไม่พบแม่แบบ CP2 ฉบับเต็ม จึงเป็นเนื้อหาเตรียมปรับตามแบบอาจารย์

## 1. วัตถุประสงค์และขอบเขต
ยืนยันว่าข้อกำหนดที่ตกลงแล้วตรวจได้, ความเสี่ยงหลักมี test coverage และผลทดสอบตรวจย้อนถึง baseline/FR/NFR ได้ ทดสอบ Academic แบบ isolated ด้วยข้อมูลจำลองเท่านั้น; ไม่ทดสอบ Production, ไม่ใช้ข้อมูล/credential จริง, ไม่วินิจฉัยโรค ไม่ประเมินผลทางคลินิกหรือการเข้าช่วยเหลือของหน่วยฉุกเฉินจริง

ขอบเขตระบบเต็ม: บัญชีและสิทธิ์, ยา/ตาราง, แจ้งเตือน/สถานะ, ผู้ดูแล/consent, เสียง/AI, SOS, ประวัติการแก้ยา. ขอบเขต Academic: ใช้ source ปัจจุบัน และระบุข้อจำกัด push/pิกัด/external provider ไว้เป็น blocked หรือจำลองเท่านั้น จนทีมและอาจารย์ตกลง; ไม่เปิดเชื่อมบริการจริงเพื่อให้ test ผ่าน

## 2. Risk-based prioritization
| Risk | ผลกระทบ | ระดับที่เสนอ | เทคนิค/ชั้นทดสอบ | เกณฑ์ก่อนปิด |
|---|---|---|---|---|
| R1 เสียงตีความเวลาผิด | บันทึกเวลาเตือนผิด | 4 | Unit equivalence/boundary, ambiguity/confirmation; system flow | เวลาในชุดคำสั่งถูกตาม expected; ไม่บันทึกก่อนยืนยัน |
| R2 เตือนไม่ถึง/ช้า/ซ้ำ | พลาดยา | 4 | scheduler boundaries, integration retry/concurrency, system device/permission | ทดสอบ local event; device delivery ต้องมี evidence ถึงอุปกรณ์และ baseline ที่รองรับ; 95/100 ภายในเวลาเสนอ TBD-02 |
| R3 เข้าถึงข้ามบัญชี | ข้อมูลส่วนบุคคลรั่ว | 3 | static review, role/ownership negative, revoke/session integration | ทุกกรณีปฏิเสธที่ไม่มีสิทธิ์; ไม่เปลี่ยนข้อมูล; log ไม่เผย secret |
| R4 กู้คืนไม่ได้ | สูญข้อมูล | 3 | backup/restore ของฐานจำลอง, compare count/checksum และ integrity | restore แยกได้และตรวจข้อมูลครบ; RPO/RTO ต้องตกลงก่อนสรุป |
| R5 SOS ไม่ถึง/แสดงผลผิด | พลาดการช่วยเหลือ | 4 | unit guard, integration persistence/error, system pending/failed | ไม่รายงาน sent/delivered ก่อนมีหลักฐาน; Academic message-only; location/push live blocked |

ระดับตาม V&V Strategy เป็นข้อเสนอ: ระดับ 3 ต้องเพิ่ม coverage สูงกว่าส่วนทั่วไป, ตรวจสิทธิ์ทุกบทบาท, review โค้ดสองคน; ระดับ 4 ต้องแจ้งอาจารย์เพื่อกำหนดเพิ่มก่อนรับรอง ไม่ถือว่าข้อกำหนดเพิ่มเติมได้รับอนุมัติแล้ว

## 3. ระดับการทดสอบและเครื่องมือ
| ระดับ | เป้าหมาย | เครื่องมือ/วิธี | ผู้รับผิดชอบเสนอ |
|---|---|---|---|
| Static | SRS, design, code, secrets, cross-role logic | checklist, peer review, ESLint, ตรวจ PR | ทั้งทีม |
| Component | voice parser, scheduler date, validation, isolated guards | Node.js test runner / Jest | พชร |
| Integration | Auth–Reminder–Notification และ PostgreSQL ทดสอบ; deny/revoke, persistence, retry | Jest/Supertest; local DB; จำลองผู้ให้บริการ | พชร + ชัยมนัส |
| System | ตั้งยา–เตือน–ยืนยัน–ผู้ดูแล; SOS; network failure; PWA/accessibility | browser/DevTools, device checklist; ไม่ถือ mock ว่าถึง device | ทั้งทีม |
| Acceptance | ผู้สูงอายุและผู้ดูแลทำภารกิจด้วยความยินยอม | UAT script, task success/time/errors, questionnaire | ชัยมนัส + พชร |

## 4. สภาพแวดล้อมและข้อมูล
- ตรึง commit SHA, OS/Node/browser/อุปกรณ์, versions, timezone Asia/Bangkok, เวลาเริ่ม/จบและ fixture version ก่อนรัน; แยกฐานทดสอบ 3 DB ตาม compose
- บัญชีจำลอง E01/E02 (ผู้สูงอายุ), C01 (ผู้ดูแลที่ได้รับสิทธิ์ E01), C02 (ไม่มีสิทธิ์), guest; ห้ามใช้ข้อมูลยา/ตำแหน่ง/อีเมลผู้ใช้จริง
- ทดสอบ guard local-only ก่อนเปิดบริการ; ไม่คัดลอก production .env; mock push/external services; ทดสอบ restore บน DB disposable ใหม่เท่านั้น
- สำหรับกรณี network/offline ให้ควบคุม latency/permission/lock-screen โดยบันทึกเงื่อนไข; ตรวจสถานะล้มเหลวและผลข้างเคียง

## 5. Entry/exit และการหยุดทดสอบ (เสนอ)
Entry: SRS baseline/RTM ตกลง; ความเสี่ยงระดับ 4 หารืออาจารย์; test environment isolated ผ่านการตรวจ; มี test fixture/expected result; ไม่มี TBD ที่ทำให้ expected result ไม่ชัดสำหรับกรณีนั้น
Exit: ทุก requirement in-scope มี test หรือ review พร้อมผล; ไม่มี critical/major ที่กระทบ safety/privacy ค้างโดยไม่ตัดสิน; regression สำคัญรันจริง; coverage เป้าหมายระดับ ≥3 branch ≥90%, ส่วนทั่วไป ≥80% (จาก strategy; ต้องยืนยัน instrumentation/ขอบเขต); ทุกบทบาททดสอบสิทธิ์; รายงาน blocked/untested แยก ไม่รวมเป็น pass
Suspend: พบ remote credential/config, ข้อมูลจริง, ผลลัพธ์แสดงความสำเร็จหลอก, ข้อผิดพลาดเสี่ยงเสียหายหรือหลุด scope ให้หยุดชุดที่เกี่ยวข้อง แยก environment แก้และรัน regression ก่อนกลับมาทดสอบ

## 6. Metrics และหลักฐาน
| Metric | วิธีวัด / เกณฑ์ |
|---|---|
| Requirement design coverage | จำนวน ID ที่มี test design / จำนวน ID ใน scope; ไม่ใช่ executed coverage |
| Execution coverage | จำนวน ID in-scope ที่มีผลจริง / ID in-scope; blocked และ not run แยก |
| Pass rate | passed / (passed + failed); ระบุจำนวน blocked/not run และ denominator |
| Branch coverage | ใช้รายงาน coverage จาก runner แยกโมดูล; ไม่ใช้จำนวนไฟล์แทน |
| Notification delivery | device-confirmed delivery / scheduled eligible events; ไม่ใช้ API accepted หรือ delivered_at ที่ยังไม่ตรวจความหมายแทน |
| Latency | timestamp ต้นทางและปลายทาง event เดียว; p50/p95; เกณฑ์ 60s และ 5s ยัง TBD-02 |
| Usability | task success, time on task, error, SUS แยกบทบาท; ≥80% ผู้สูงอายุทำชุดภารกิจโดยไม่ช่วยตาม NFR-02; SUS ไม่มีเกณฑ์ผ่านใน SRS |
| Defect | severity, requirement, reproduction, baseline, actual/expected, evidence, owner, retest status |

Evidence ต่อ run: run ID, commit, environment, test ID, requirement ID, input fixture (ไม่อ่อนไหว), expected, actual, pass/fail/blocked/not run, เวลา, reviewer, link artifact, issue ID ถ้ามี; ไม่เผยแพร่ raw log ก่อน redact

## 7. ลำดับงานและ Regression
- ก่อน CP1: self-inspection, ตกลง SRS; หลัง CP1: ใช้ข้อแก้จริงและ SRS 1.1
- ก่อน CP2: ตกลง severity/priority/coverage, scope Academic และแผนจาก SDD
- CP3: แตก test design matrix เป็น test cases จริงตามแม่แบบ พร้อม RTM (รวม DR/UI/SI); review negative/boundary
- CP4: รัน component→integration→system→acceptance ตาม entry; บันทึก baseline และผลจริง; CP5 สรุป coverage/defect/residual risk
- Regression ทุกการแก้: auth/permission, scheduler/voice/time, medication state, SOS/error; ทดสอบเพิ่มเฉพาะส่วนกระทบ และ rerun ชุด critical ก่อน release

## 8. Usability evidence เดิม
มีแบบสอบถาม SUS จากระบบเดิมในเดือนตุลาคม (13 ผู้ตอบ ตอบครบ 10 ข้อ) ไม่ทราบ baseline/บทบาท/อายุหรือ task completion จากไฟล์ จึงไม่ใช่หลักฐานว่าผ่าน NFR-02 ของ Academic. ข้อ 2 เป็นข้อความเชิงบวกต่างจาก SUS มาตรฐาน; หากนำเสนอให้ใช้การคิดคะแนนตามทิศทางจริงและระบุ Adapted SUS. เก็บข้อมูลรายบุคคลไว้นอก repo Public. ไม่จัด SUS เป็นงานส่งแยกเพราะยังไม่พบข้อกำหนดรายวิชาเช่นนั้น

## 9. ข้อค้างก่อนรับรอง
TBD-02: นิยามเกณฑ์เวลาส่งและสภาพเครือข่าย; TBD-03: Missed/Snooze/retry; TBD-04: provider/อุปกรณ์; TBD-05: retention; TBD-06: schema/API/deployment/restore; TBD-07: UAT และสิทธิ์รายฟิลด์. กำหนดเจ้าของและวันตัดสินตามจริงโดยทั้งทีม. ผลทดสอบทั้งหมดในร่างนี้ยัง Not run
