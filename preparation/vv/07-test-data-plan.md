# Test Data Plan — T09 (working draft)

> ENGSE601 · กำหนดส่ง 2 ก.พ. 2570 13:00 · ตรวจรวม CP4 · ยังไม่ใช่งานส่ง
> ตำแหน่งส่งจริง docs/vv/test-data-plan.md และ seed script ใน repo เมื่อผ่านการตรวจและรันจริง

## 1. หลักการและแหล่งข้อมูล
ใช้ข้อมูลสังเคราะห์ทั้งหมด (ไม่คัดลอกข้อมูลจาก AHA Production, SUS หรือ backup) ออกแบบจาก Equivalence Partitioning (EP), Boundary Value Analysis (BVA), decision table สิทธิ์ และสถานะ. ใช้ fixture ที่กำหนดค่าแน่นอนแทน Faker เพื่อให้ผลเทียบซ้ำได้; รหัสบัญชี/ยา/ความสัมพันธ์/เหตุแจ้งเตือนคงที่ แต่รหัสผ่านทดสอบและ salt เปลี่ยนทุก isolated project. ชื่อ Synthetic E01 ฯลฯ, อีเมล example.invalid, โทรศัพท์ TEST-E01 ไม่ใช่หมายเลขโทรศัพท์, ชื่อยา FIXTURE-MED ไม่ใช่ชื่อยา/คำแนะนำการแพทย์จริง. ไม่มีข้อมูลจริงจึงไม่ต้อง masking ใน seed นี้ หากจำเป็นต้องใช้ข้อมูลจริงในอนาคตต้องได้รับอนุญาต/ประเมินความจำเป็นก่อน ใช้ข้อมูลสังเคราะห์แทน identifier และข้อมูลสุขภาพทั้งหมด และไม่เผยแพร่ข้อมูลระดับบุคคล; ยังไม่ได้อนุญาตให้ใช้ข้อมูลจริง

## 2. ชุดข้อมูลและกรณีทดสอบ
| ชุด | จำนวน/ตัวอย่าง | เทคนิค | Test case ที่ใช้ (ร่าง D13/CP3) |
|---|---|---|---|
| TD-AUTH | 5 บัญชี E01/E02, C01/C02/C03; อายุจำลอง 60/75/35/40/30 | EP บทบาท, valid/invalid credentials | D13-P01/P02, AUTH-* |
| TD-LINK | 4 ความสัมพันธ์: C01–E01 accepted, C02–E02 accepted, C03–E01 pending, C03–E02 rejected | EP/decision table linked/unlinked/pending/rejected | D13-P05/P06/P07, CARE-* |
| TD-REM | 6 รายการ: E01 00:00/23:59/weekly/disabled; E02 future/expired | BVA เวลา, EP ความถี่/สถานะ/ช่วงวัน | D13-P03/P04/P08/P09, REM-* |
| TD-NEG | invalid 24:00, 12:60; token missing; wrong password; ownership mismatch | BVA/EP ข้อมูลผิดและสิทธิ์ | D13-P02/P04/P06/P11, REM-BVA, AUTH-NEG, IDOR |
| TD-NOTIFY | 3 เหตุ: E01 unread, E02 read, C01 unread; related_id อ้าง reminder จริงใน fixture | EP สถานะ/ผู้รับ | D13-P10/P12/P13, NOTIFY-* |
| TD-SOS | message-only / location field / provider disabled | EP, negative | D13-P10/P11/P12/P13, SOS-LOCATION/PUSH-DISABLED |
| TD-RECOVERY | clone fixture ในฐาน disposable แยก (ยังไม่มี restore trial ใน seed) | Recovery | CP4 restore case รอออกแบบ |
| TD-UAT | ภารกิจบนบัญชีจำลอง; ไม่ใช้ raw SUS | Task-based | CP4 UAT/NFR รอเกณฑ์ |

ค่าผิดไม่ seed เข้า DB ที่ต้องมี integrity; ส่งผ่าน API/Unit Test ภายหลัง. วันที่สร้าง fix 2027-02-02T00:00:00Z; กรณี scheduler ที่ต้องตรวจเวลาเฉพาะวันต้องใช้ clock injection หรือ anchor ที่ตกลงก่อนรัน; ห้ามใช้เวลาปัจจุบันแทน oracle โดยไม่บันทึก. ภาพ/ข้อมูลจริงไม่จำเป็น

## 3. Schema และการสร้างข้อมูลซ้ำ
ใช้ migrations ที่มีจริง: auth users + family_connections, reminder reminders, notification notifications. แยก PostgreSQL สามฐานตาม docker-compose.yml. เริ่มเฉพาะ DB ใน Compose project ชื่อสุ่ม aha-t09-fixture-... ใหม่ทุกครั้ง; ตรวจ local Docker context, network internal, ไม่มี external volume; ไม่ใช้ .env เดิม, สร้าง env เฉพาะ fixture ที่ Git ignore และไม่พิมพ์ secret. ไม่เปิด server/push/email ในขั้น seed. รัน migration ใน container ด้วย node src/config/migrate.js (runtime image ไม่มี npm). บันทึก deterministic IDs/rows และ hash password ด้วย pgcrypto bcrypt. ไม่มี TRUNCATE/DELETE ฐานเดิม; cleanup เฉพาะ project ที่ผู้ใช้ระบุชัดเจน

คำสั่งเดียวจาก root ของ Branch เตรียมงาน (ต้องมี Python 3, Docker Compose v2 และ build image ได้):
```bash
python preparation/vv/d12-d13/seed.py
```
ตรวจ manifest แบบไม่ใช้ Docker: python preparation/vv/d12-d13/seed.py check
ตรวจ DB หลัง seed: python preparation/vv/d12-d13/seed.py verify <ชื่อ project ที่แสดง>
ทดลอง HTTP draft subset (หลังตรวจ seed และพอร์ต loopback ว่าง): python preparation/vv/d12-d13/seed.py api <project>
ทำความสะอาดเมื่อเสร็จ: python preparation/vv/d12-d13/seed.py cleanup <project>
แต่ละรอบต้องสร้าง project ใหม่เพื่อหลีกเลี่ยงผลค้างจาก scheduler/API. ถ้ารันไม่สำเร็จให้ตรวจ local log แบบ redact แล้ว cleanup project นั้นเท่านั้น; ไม่ใช้ docker system prune

## 4. Referential integrity และเกณฑ์ตรวจ
| ตรวจ | Expected |
|---|---|
| จำนวนและ unique ID | users=5, family=4, reminders=6, notifications=3; ID ไม่ซ้ำทั้ง manifest |
| FK ภายใน Auth | requester/requested มีอยู่จริงตาม FK ของ family_connections |
| ความสัมพันธ์ข้าม DB | ทุก reminder.user_id อ้าง elderly ใน Auth; notification.user_id อ้างบัญชีที่มี; notification.related_id ในชุดนี้อ้าง reminder ที่มี; เทียบ actual ID/owner pairs กับ manifest ไม่ใช้ count อย่างเดียว |
| Domain/EP/BVA | role/status/weekly days/time/active/date และ dedupe key ตรง fixture |
| PDPA | ข้อมูล identity เป็น Synthetic, example.invalid, TEST-*; ไม่มีข้อมูลจริง; credentials ทดสอบแยกและไม่ commit |
| ทำซ้ำ | สอง project ใหม่มีชุดข้อมูล logical เดียวกัน; hash password/salt และรหัส project ไม่ต้องตรงกัน |

Script มี manifest check และ DB verification เปรียบเทียบข้อมูลที่เลือกจริง. delivered_at ใน schema มีค่า NOT NULL; timestamp ที่ seed เป็นค่าจำลอง ไม่ใช่หลักฐานส่ง push ถึงอุปกรณ์. ยังต้องตรวจผลจากการรันสองรอบและเก็บ log แบบไม่เปิดข้อมูลอ่อนไหวก่อนถือว่าเสร็จตามโจทย์

## 5. สถานะ
สร้างร่าง fixture, script, OpenAPI subset และ HTTP test runner แล้ว; ยังไม่มีผลรัน Docker/PostgreSQL หรือ HTTP จริงจากงานรอบนี้. ไม่รับรองว่าผ่าน D12/CP4. ก่อนส่งจริงให้ย้ายเฉพาะงานที่ตรวจแล้วเข้าตำแหน่งอาจารย์กำหนด และปรับชื่อ test case ตาม RTM หลัง CP3.
