# D13 — Integration and API Testing (working draft)

> ENGSE601 T09 · 27 พ.ย. 2569 · กำหนดส่ง 9 ก.พ. 2570 เวลา 13:00 น.  
> สถานะ: เตรียมงานเท่านั้น ไม่ใช่ผลงานส่ง ไม่ใช่ผลรันทดสอบ  
> Main baseline หลังลบ placeholder: d78e0600eb454066866a0dddd1dbe518fdfe81e2

## 1. ข้อกำหนดรายวิชาที่ได้รับ
- Integration และ API test และบันทึกข้อบกพร่องใน issue tracker
- ส่งที่ tests/integration/
- ยังไม่มีรายละเอียดโจทย์ฉบับเต็มเพิ่มเติม; ชื่อไฟล์ รูปแบบรายงาน และจำนวนกรณีด้านล่างเป็นข้อเสนอ ไม่ใช่ข้อบังคับของอาจารย์
- เดินตามลำดับ CP1 → CP2 → CP3 ก่อนรับรอง test case และดำเนิน D13; เก็บร่างใน preparation/vv เท่านั้น ไม่สร้างตำแหน่งส่งงานบน main ก่อนพร้อม

## 2. สิ่งที่มีจริง (static inventory)
| รายการ | หลักฐานใน AHA-T09 | ข้อจำกัด |
|---|---|---|
| Reminder HTTP handler tests | backend/reminder-service/tests/audit-idor-20261016.test.js | Supertest และ mock DB/fetch; ไม่ใช่ผล HTTP ข้าม service จริง |
| Notification HTTP handler tests | backend/notification-service/tests/security.test.js | Supertest และ mock DB/push; ไม่ยืนยัน delivery ถึงอุปกรณ์ |
| Family connection tests | backend/auth-service/tests/family-connection-security.test.js | อ่านชื่อ test แล้ว; ต้องทบทวน setup/assertion ก่อนจัดหมวด |
| Session revocation tests | backend/auth-service/tests/session-revocation.test.js | ต้องเชื่อม test สิทธิ์ราย endpoint กับ RTM |
| Auth–Reminder real HTTP workflow | .github/workflows/aha-family-idor-postgres.yml | เรียก ci/isolated-family-idor.cjs ซึ่งไม่พบใน Git tree ของ Academic baseline |
| Auth–Notification real HTTP workflow | .github/workflows/aha-notification-sos-postgres.yml | เรียก ci/isolated-notification-sos.cjs ซึ่งไม่พบใน Git tree ของ Academic baseline |
| DB/Network/SOS guards | tests/security/academic-db.test.cjs, academic-network.test.cjs, academic-sos.test.cjs | ทดสอบขอบเขต isolation ไม่เท่ากับ end-to-end integration |
| Historical evidence | ระบบต้นฉบับ app-tod PR #65 รายงานผลบน a4af2e455133d06d79a7c7da58692640d2c86984 | เป็นผลย้อนหลังที่รายงานใน PR ไม่ได้ตรวจ log ต้นฉบับครบและไม่ใช่ AHA-T09; ห้ามย้ายตัวเลขเป็นผล D13 |

ตรวจ GitHub Actions ของ AHA-T09 พบ 2 runs สำเร็จเป็นงานอัปเดต dependency ไม่ใช่หลักฐาน integration; ไม่สามารถอ่านรายการ artifacts ผ่าน connector ได้. Issue #1 เป็น issue ทดลอง labels ไม่ใช่หลักฐานข้อบกพร่องจากการทดสอบ D13.

## 3. Candidate test design (อ้างรหัสจากร่าง CP3; Not run ทั้งหมด)

| ID เตรียม | ข้อกำหนดเสนอ | ขั้นตอน/เงื่อนไข | Expected result | ประเภท |
|---|---|---|---|---|
| D13-P01 | FR-01.01, NFR-05 | login/session จำลองที่ถูกต้องแล้วอ่าน endpoint ที่มีสิทธิ์ | สำเร็จตามสัญญา API; ไม่เผย token ใน log | API positive |
| D13-P02 | FR-01.03, NFR-05 | เรียก API ที่ต้องยืนยันตัวตนโดยไม่มี JWT/ JWT ผิด issuer | ปฏิเสธตามสัญญา API; ไม่มีการเปลี่ยนข้อมูล | API negative |
| D13-P03 | FR-02.01, FR-02.05 | สร้างยา E01 ด้วยข้อมูลจำลองแล้วอ่านกลับ | ค่าและเจ้าของตรงกับข้อมูลที่ส่ง | API + DB |
| D13-P04 | FR-02.04 | ส่งเวลา/ข้อมูลที่ผิดรูปแบบ | ปฏิเสธ; ไม่เกิด record ใหม่ | API negative |
| D13-P05 | FR-05.01, FR-07 | C01 มีสิทธิ์ E01 เท่านั้น; เรียก summary | คืนเฉพาะข้อมูลที่อนุญาต | Cross-service + DB |
| D13-P06 | FR-01.03, FR-05.03, DR-02 | C02 ไม่ได้เชื่อม E01; ขอสร้าง/ลบยา | ปฏิเสธตาม API contract; DB เดิมไม่เปลี่ยน | Cross-service negative |
| D13-P07 | FR-07.03–04 | เพิกถอนความสัมพันธ์แล้วเรียก read/write ใหม่ | ไม่สามารถอ่านหรือแก้ข้อมูลหลัง revoke | Cross-service + DB |
| D13-P08 | FR-03.01, FR-03.04 | ตั้งตารางถึงกำหนดและแก้เวลาจำลองก่อนถึง | เกิดเหตุเฉพาะเวลาที่กำหนดใหม่; ไม่ใช้ตารางเดิม | Scheduler integration |
| D13-P09 | FR-04.05 | ส่งคำขอยืนยันเหตุเดียวกันซ้ำ/พร้อมกัน | ไม่สร้างผลทางธุรกิจซ้ำ | API + DB concurrency |
| D13-P10 | FR-09.01, FR-09.06 | SOS message-only บน local fixture และจำลอง failure | สถานะตรงผล API; ไม่แสดงว่าถึงอุปกรณ์โดยไม่มีหลักฐาน | Integration |
| D13-P11 | FR-09.02, SI-03 | ส่ง location field ใน Academic | ปฏิเสธตาม Academic guard; ไม่เก็บพิกัด | API negative |
| D13-P12 | FR-09.03, FR-06.02 | E01 ขอ SOS; C01 เชื่อม, C02 ไม่เชื่อม | เฉพาะผู้รับที่มีสิทธิ์ (local event); ไม่ส่ง push จริง | Cross-service |
| D13-P13 | SI-01, NFR-03 | เรียก live push subscription ใน Academic | ปฏิเสธตาม guard; device delivery ไม่อยู่ในขอบเขตรันทดสอบนี้ | API negative |
| D13-P14 | FR-11.01–03 | C01 ที่มีสิทธิ์แก้ยา E01 | ตรวจ audit, local event, ข้อมูลล่าสุดและไม่รั่วข้ามบัญชี | Integration |
| D13-P15 | DR-04, NFR-05 | ตรวจ config local-only ก่อนรัน | remote/production config ถูกปฏิเสธ; ใช้ fixture เท่านั้น | Isolation gate |

ยังไม่รับรอง mapping/expected ของทุกแถวว่าเป็นสัญญา API จริง; ตรวจ SRS หลัง CP1 และ source route/controller ก่อนเขียน test executable. กรณีเวลา/retry/consent ที่มี TBD ต้องตกลงก่อนตั้ง oracle. ผลทุกแถว Not run. ห้ามนับผลทดสอบ mock ว่าผ่าน real cross-service.

## 4. แผนดำเนินการเมื่อถึง D13
1. ตรวจโจทย์/แม่แบบอาจารย์ฉบับเต็ม และตรึง baseline หลัง CP3; ใช้ RTM ที่ตกลงแล้ว
2. ตรวจสองสคริปต์ที่หายจาก Academic snapshot: หากนำกลับจากต้นฉบับ ต้องตรวจความเข้ากันได้ ลบข้อมูลภายในที่ไม่ควรเผยแพร่ และตรวจว่าไม่มี production config/credentials; หากไม่เหมาะ ให้เขียนใหม่สำหรับ Academic local-only
3. ตรวจ Docker Compose/Node/lockfile, DB migrations ทั้งสามบริการ, test setup และ fixture; ใช้ DB disposable ใหม่, บัญชีสมมติ และไม่มี outbound push/email
4. นำ test ที่เหมาะสมมาจัดให้อยู่ใน tests/integration/ หรือสร้าง entrypoint ที่ทำซ้ำได้ตามเกณฑ์อาจารย์ ไม่ทำ duplicate test โดยไม่จำเป็น
5. รัน API handler tests และ real HTTP integration แยกประเภท ตรวจ exit code/actual/expected; เก็บผล run ตาม commit จริง และตรวจว่าไม่มีข้อมูลอ่อนไหว
6. เมื่อพบ defect จริง เปิด issue มี requirement ID, test ID, baseline, reproduction, expected/actual, sanitized evidence, owner และป้าย type:defect กับ severity เพียงระดับเดียว; retest หลังแก้. ถ้าไม่พบ defect ให้รายงานตามจริง ไม่สร้าง issue สมมติ
7. ตรวจตาม rubric แล้วจึงนำงานที่เสร็จจริงเข้า main; ไม่สร้าง placeholder เพื่อให้ระบบอัตโนมัติขึ้นผ่าน

## 5. รูปแบบบันทึกผลที่เสนอ (ยังไม่มีผล)
Run ID / commit SHA / เวลา / environment / test ID / requirement ID / expected / actual / status (Not run, Pass, Fail, Blocked) / evidence / issue ID / retest.
แยก historical evidence ออกจาก AHA-T09 และแยก configuration blocker จาก application defect. ไม่แนบ raw logs หรือข้อมูลผู้ใช้จริงใน repo Public.

## 6. ข้อค้าง
- สคริปต์ real HTTP สองไฟล์ที่อ้างใน Workflow ยังไม่อยู่ใน Academic tree
- ยังไม่ได้รันทดสอบ D13 หรือสร้าง issue จากผลรัน
- ยังไม่รับรองเกณฑ์/แม่แบบ D13 ฉบับเต็ม
- ผล SUS เป็น usability evidence เดิม ไม่ใช่ผล Integration/API
- ไม่แก้ runtime หรือ Production เพื่อให้ชุดทดสอบผ่าน
