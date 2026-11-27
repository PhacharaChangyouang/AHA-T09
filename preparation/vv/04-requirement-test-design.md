# CP3 preparation — Requirement / test design matrix

> T09 · 27 พ.ย. 2569 · ฉบับเตรียมงาน (ยังไม่ใช่งานส่งและไม่ใช่ผลทดสอบ) · baseline `ac69042fc88a1b2452c242c4dbf6c9c70ef48560`

อ้าง SRS 3.2, 4.2, 5.1, 5.2, 6 และ RTM บท 7: 45 FR + 7 NFR + 5 DR + 4 UI + 3 SI = 64 ID. แถวนี้เป็น candidate acceptance criteria และ test design ไม่ใช่ execution results หรือ RTM ทางการ. BR และ TC สำหรับ DR/UI/SI ที่ระบุ (เสนอ) ต้องรับรองกับทีม; รหัสเดิม FR/NFR และ TC-01–12 จาก SRS ไม่เปลี่ยน. TC-PREP-<ID> เป็นรหัสเตรียมงานเฉพาะ ไม่ใช่การอ้างว่ามีไฟล์ test จริง. ทุกแถว Not run. ระดับ integrity เป็นข้อเสนอการจัดลำดับ ไม่ใช่ระดับที่อาจารย์รับรอง; กรณี blocked แยก Full/Academic. ให้แยกกรณี positive/negative/boundary เพิ่มก่อน CP3 ตามแม่แบบอาจารย์

## ตาราง 64 รายการ

| Requirement | ที่มา BR | UC | โมดูลเสนอ | TC เดิม/เสนอ | ระดับ | Integrity เสนอ | Candidate test ID | Given | When | Then | Evidence/gap | สถานะ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FR-01.01 | BR-02 | UC-01 | Auth | TC-01,TC-04 | Integration | 3 | TC-PREP-FR-01.01 | ผู้ใช้ยังไม่ยืนยันตัวตน | ขอข้อมูลบัญชี | ปฏิเสธและไม่คืนข้อมูลบัญชี | auth/session test | Not run |
| FR-01.02 | BR-02 | UC-01 | Auth | TC-01,TC-04 | Integration | 3 | TC-PREP-FR-01.02 | บัญชีจำลองที่สร้างผ่านช่องทางที่รองรับ | ตรวจบทบาทที่ได้รับ | ได้บทบาทผู้สูงอายุหรือผู้ดูแลตามสิทธิ์ที่กำหนด | ต้องตรวจ role validation | Not run |
| FR-01.03 | BR-02 | UC-01 | Auth | TC-01,TC-04 | Integration | 3 | TC-PREP-FR-01.03 | C02 ไม่มีสิทธิ์ใน E01 | อ่านหรือแก้ข้อมูล E01 | ปฏิเสธและข้อมูลเดิมไม่เปลี่ยน | auth/family; reminder IDOR | Not run |
| FR-02.01 | BR-01 | UC-02 | Reminder | TC-01,TC-11 | Integration | 3 | TC-PREP-FR-02.01 | E01 มีสิทธิ์และข้อมูลจำเป็นครบ | เพิ่มยาและเวลา 08:00 | บันทึกและอ่านกลับค่าที่ส่งได้ | ต้องเพิ่ม CRUD fixture | Not run |
| FR-02.02 | BR-01 | UC-02 | Reminder | TC-01,TC-11 | Integration | 3 | TC-PREP-FR-02.02 | E01 มีรายการยาเดิม | แก้เวลาเป็น 09:00 | ข้อมูลล่าสุดตรงค่าที่บันทึก | ต้องเพิ่ม CRUD fixture | Not run |
| FR-02.03 | BR-01 | UC-02 | Reminder | TC-01,TC-11 | Integration | 3 | TC-PREP-FR-02.03 | E01 มีรายการที่ active | ขอปิดรายการ | รายการไม่ active และไม่เกิดเตือนใหม่จากรายการนี้ | ต้องเพิ่ม integration | Not run |
| FR-02.04 | BR-01 | UC-02 | Reminder | TC-01,TC-11 | Integration | 3 | TC-PREP-FR-02.04 | E01 มีสิทธิ์ | ส่งรายการขาดเวลาหรือเวลาไม่ถูกต้อง | ปฏิเสธและไม่สร้างรายการ | ต้องเพิ่ม validation | Not run |
| FR-02.05 | BR-01 | UC-02 | Reminder | TC-01,TC-11 | Integration | 3 | TC-PREP-FR-02.05 | E01 มีรายการที่แก้แล้ว | อ่านรายการ | คืนค่าล่าสุดเฉพาะข้อมูลที่มีสิทธิ์ | ต้องเพิ่ม CRUD fixture | Not run |
| FR-03.01 | BR-01 | UC-03 | Reminder/Notification | TC-02,TC-05 | Unit/Integration/System | 4 | TC-PREP-FR-03.01 | ตาราง active ถึงกำหนดในวันเลือก | รัน scheduler ด้วยเวลาจำลอง | สร้างเหตุเตือนตรงตาราง; ไม่สร้างกรณียังไม่ถึงหรือหมดอายุ | scheduler-date; event creation ยังต้องตรวจ | Not run |
| FR-03.02 | BR-01 | UC-03 | Reminder/Notification | TC-02,TC-05 | Unit/Integration/System | 4 | TC-PREP-FR-03.02 | มีเหตุเตือนครบกำหนด | เรียกการส่งในสภาพแวดล้อมจำลอง | บันทึกผลส่งตามจริง; delivery จริง blocked ใน Academic | scheduler guard; live push blocked | Not run |
| FR-03.03 | BR-01 | UC-03 | Reminder/Notification | TC-02,TC-05 | Unit/Integration/System | 4 | TC-PREP-FR-03.03 | เหตุมีเวลานัดและผลส่งจำลอง | ตรวจประวัติเหตุ | กำหนดเวลาและผลส่งตรงเหตุเดียวกัน | ต้องเพิ่ม event logging test | Not run |
| FR-03.04 | BR-01 | UC-03 | Reminder/Notification | TC-02,TC-05 | Unit/Integration/System | 4 | TC-PREP-FR-03.04 | แก้เวลา 08:00 เป็น 09:00 ก่อนเกิดเหตุ | ผ่าน 08:00 แล้ว 09:00 | ไม่ส่งจากตารางเก่า; เหตุใหม่ตามตารางที่ยัง active | ต้องเพิ่ม edit/cancel race | Not run |
| FR-04.01 | BR-01 | UC-04 | Reminder | TC-01,TC-03 | Integration | 3 | TC-PREP-FR-04.01 | E01 มีเหตุ pending | ยืนยัน | บันทึก Taken และเวลายืนยันจริง | ต้องเพิ่ม status test | Not run |
| FR-04.02 | BR-01 | UC-04 | Reminder | TC-01,TC-03 | Integration | 3 | TC-PREP-FR-04.02 | E01 มีเหตุ pending | เลื่อนตามค่าที่อนุมัติ | สถานะ Snoozed และเวลาถัดไปถูกต้อง | TBD-03 | Not run |
| FR-04.03 | BR-01 | UC-04 | Reminder | TC-01,TC-03 | Integration | 3 | TC-PREP-FR-04.03 | เหตุยังไม่ยืนยัน | ผ่านเกณฑ์ Missed ที่ตกลง | แสดง Missed ไม่ตีความว่าไม่ได้กินจริง | TBD-03 | Not run |
| FR-04.04 | BR-01 | UC-04 | Reminder | TC-01,TC-03 | Integration | 3 | TC-PREP-FR-04.04 | E01 มีประวัติและ C01 ได้สิทธิ์ | อ่านประวัติ | คืนสถานะและเวลาตรงข้อมูลเฉพาะที่อนุญาต | ต้องเพิ่ม status history | Not run |
| FR-04.05 | BR-01 | UC-04 | Reminder | TC-01,TC-03 | Integration | 3 | TC-PREP-FR-04.05 | เหตุ E01 ยืนยันแล้ว | ส่งคำขอเดิมซ้ำ/พร้อมกัน | ไม่สร้างบันทึกซ้ำ | ต้องเพิ่ม idempotency | Not run |
| FR-05.01 | BR-02 | UC-05 | Auth/Reminder | TC-03,TC-12 | Integration | 3 | TC-PREP-FR-05.01 | C01 เชื่อม E01 แต่ไม่เชื่อม E02 | อ่านตารางผู้สูงอายุ | เห็นเฉพาะ E01 | audit-idor summary | Not run |
| FR-05.02 | BR-02 | UC-05 | Auth/Reminder | TC-03,TC-12 | Integration | 3 | TC-PREP-FR-05.02 | E01 ยืนยันสถานะ | C01 อ่านสถานะล่าสุด | แสดงสถานะและเวลาล่าสุดตรง event | ต้องเพิ่ม latency/visibility | Not run |
| FR-05.03 | BR-02 | UC-05 | Auth/Reminder | TC-03,TC-12 | Integration | 3 | TC-PREP-FR-05.03 | C02 ไม่เชื่อม E01 | อ่านข้อมูล E01 | ปฏิเสธและไม่เผยข้อมูล | audit-idor; read negative เพิ่ม | Not run |
| FR-06.01 | BR-02 | UC-06 | Notification | TC-03,TC-12 | Integration | 3 | TC-PREP-FR-06.01 | เหตุเข้าเงื่อนไขที่อนุมัติ | ประเมินเงื่อนไข | สร้างเหตุที่ต้องติดตามหนึ่งรายการ | TBD-03 | Not run |
| FR-06.02 | BR-02 | UC-06 | Notification | TC-03,TC-12 | Integration | 3 | TC-PREP-FR-06.02 | มีเหตุและผู้ดูแลได้รับสิทธิ์ | ส่งผ่านช่องทางจำลอง | เลือกเฉพาะผู้รับที่ได้รับสิทธิ์; ไม่อ้างถึงอุปกรณ์จริง | ต้องเพิ่ม recipient test | Not run |
| FR-06.03 | BR-02 | UC-06 | Notification | TC-03,TC-12 | Integration | 3 | TC-PREP-FR-06.03 | ผู้ให้บริการจำลองตอบล้มเหลว | ตรวจประวัติ | บันทึกผลล้มเหลวตามจริงและสัมพันธ์ event | ต้องเพิ่ม failure test | Not run |
| FR-07.01 | BR-02 | UC-07 | Auth | TC-04 | Integration | 3 | TC-PREP-FR-07.01 | C01 ส่งคำขอเชื่อม E01 | E01 เปิดหน้าคำขอ | แสดงคำขอของ E01 เท่านั้น | ต้องเพิ่ม request listing | Not run |
| FR-07.02 | BR-02 | UC-07 | Auth | TC-04 | Integration | 3 | TC-PREP-FR-07.02 | คำขอ E01 อยู่ pending | E01 ยืนยัน | สิทธิ์เปิดตามขอบเขตที่อนุมัติ | ต้องเพิ่ม accept/role | Not run |
| FR-07.03 | BR-02 | UC-07 | Auth | TC-04 | Integration | 3 | TC-PREP-FR-07.03 | C01 เชื่อม E01 | E01 เพิกถอน | ความสัมพันธ์ไม่อนุญาตเข้าถึงต่อ | family deletion test partial | Not run |
| FR-07.04 | BR-02 | UC-07 | Auth | TC-04 | Integration | 3 | TC-PREP-FR-07.04 | C01 ถูกเพิกถอน | อ่าน/แก้ E01 | ปฏิเสธทั้งการอ่านและเขียน | family/IDOR tests partial; revoke integration เพิ่ม | Not run |
| FR-08.01 | BR-03 | UC-08 | Voice/Web | TC-06,TC-09,TC-10 | Unit/System | 4 | TC-PREP-FR-08.01 | มีข้อความคำสั่งตัวอย่างในขอบเขต | ส่งเข้า parser | ตีความ intent และเวลาตรง fixture | voice-understanding; speech input ยังต้องทดสอบ | Not run |
| FR-08.02 | BR-03 | UC-08 | Voice/Web | TC-06,TC-09,TC-10 | Unit/System | 4 | TC-PREP-FR-08.02 | parser ได้ intent/เวลา | ระบบแสดงสิ่งที่เข้าใจ | ค่าที่แสดงตรงผลตีความก่อนบันทึก | parser test partial; UI เพิ่ม | Not run |
| FR-08.03 | BR-03 | UC-08 | Voice/Web | TC-06,TC-09,TC-10 | Unit/System | 4 | TC-PREP-FR-08.03 | คำสั่งจะเปลี่ยนข้อมูลแต่ยังไม่ยืนยัน | กด/พูดไม่ยืนยันหรือแก้เวลา | ไม่บันทึกจนยืนยันค่าที่แก้ถูกต้อง | voice confirmation tests; persistence เพิ่ม | Not run |
| FR-08.04 | BR-03 | UC-08 | Voice/Web | TC-06,TC-09,TC-10 | Unit/System | 4 | TC-PREP-FR-08.04 | ไมค์ถูกปฏิเสธหรือเสียงใช้งานไม่ได้ | เปิดภารกิจหลัก | มีปุ่มสำรองให้ทำภารกิจต่อ | ต้องเพิ่ม device/UI | Not run |
| FR-09.01 | BR-02 | UC-09 | Notification | TC-05,TC-08 | Unit/Integration/System | 4 | TC-PREP-FR-09.01 | E01 มีสิทธิ์ | ร้องขอ SOS message-only | สร้างเหตุจำลองและไม่แสดงสำเร็จก่อนผล API | academic-sos; mobile widget supplemental | Not run |
| FR-09.02 | BR-02 | UC-09 | Notification | TC-05,TC-08 | Unit/Integration/System | 4 | TC-PREP-FR-09.02 | ผู้ใช้อนุญาตพิกัดและมีพิกัด | ส่งพิกัด | Full: แนบพิกัดจริงตามสิทธิ์; Academic: ปฏิเสธ location field ตาม guard | Academic blocked; guard negative | Not run |
| FR-09.03 | BR-02 | UC-09 | Notification | TC-05,TC-08 | Unit/Integration/System | 4 | TC-PREP-FR-09.03 | E01 มี C01 เชื่อมและ C02 ไม่เชื่อม | สร้าง SOS | เหตุจำลองเลือกเฉพาะ C01 | ต้องเพิ่ม recipient integration | Not run |
| FR-09.04 | BR-02 | UC-09 | Notification | TC-05,TC-08 | Unit/Integration/System | 4 | TC-PREP-FR-09.04 | ผู้รับมี push permission และอุปกรณ์พร้อม | ส่ง SOS | Full: วัด device delivery; Academic: ห้ามส่งจริง | Academic blocked | Not run |
| FR-09.05 | BR-02 | UC-09 | Notification | TC-05,TC-08 | Unit/Integration/System | 4 | TC-PREP-FR-09.05 | ไม่ได้พิกัดหรือไม่อนุญาต | ขอ SOS | แสดงข้อจำกัดโดยไม่สร้างพิกัดสมมติ | Academic message-only guard; UI เพิ่ม | Not run |
| FR-09.06 | BR-02 | UC-09 | Notification | TC-05,TC-08 | Unit/Integration/System | 4 | TC-PREP-FR-09.06 | network ขาดหรือ API ล้มเหลว | กด SOS | แสดง pending/failed และทางเลือกสำรอง ไม่รายงาน success | mobile sos test supplemental; web เพิ่ม | Not run |
| FR-10.01 | BR-03 | UC-10 | Voice/AI | TC-04,TC-07 | Unit/System | 3 | TC-PREP-FR-10.01 | E01 มีตารางที่อนุญาต | ถามตารางยาของตน | ตอบจากข้อมูลที่มีสิทธิ์เท่านั้น | ตรวจ scope/provider; fixture เพิ่ม | Not run |
| FR-10.02 | BR-03 | UC-10 | Voice/AI | TC-04,TC-07 | Unit/System | 3 | TC-PREP-FR-10.02 | คำถามวิธีใช้งานในขอบเขต | ถามระบบ | ตอบวิธีใช้งานตรงคู่มือ | ต้องเพิ่ม approved corpus | Not run |
| FR-10.03 | BR-03 | UC-10 | Voice/AI | TC-04,TC-07 | Unit/System | 3 | TC-PREP-FR-10.03 | ผู้ใช้ถามการวินิจฉัยหรือเพิ่มขนาดยา | ส่งคำถาม | ปฏิเสธคำแนะนำการแพทย์และไม่แก้ข้อมูล | voice dosage scope partial | Not run |
| FR-10.04 | BR-03 | UC-10 | Voice/AI | TC-04,TC-07 | Unit/System | 3 | TC-PREP-FR-10.04 | คำสั่งเปลี่ยนข้อมูลยังไม่ยืนยัน | ส่งคำสั่ง/ข้อความกำกวม | ไม่เขียนจนผู้ใช้ยืนยัน | voice parser partial; AI flow เพิ่ม | Not run |
| FR-10.05 | BR-03 | UC-10 | Voice/AI | TC-04,TC-07 | Unit/System | 3 | TC-PREP-FR-10.05 | E01 ขอข้อมูลของ E02 | ถามข้อมูลข้ามสิทธิ์ | ปฏิเสธไม่คืนข้อมูล | auth guard partial; AI-specific เพิ่ม | Not run |
| FR-11.01 | BR-02 | UC-11 | Reminder/Notification | TC-11 | Integration | 3 | TC-PREP-FR-11.01 | C01 มีสิทธิ์แก้ยา E01 | แก้รายการ | บันทึกผู้แก้ เวลา และรายการเปลี่ยนตรง event | ต้องเพิ่ม audit test | Not run |
| FR-11.02 | BR-02 | UC-11 | Reminder/Notification | TC-11 | Integration | 3 | TC-PREP-FR-11.02 | C01 แก้ยา E01 สำเร็จ | ตรวจเหตุแจ้งในระบบ | มีเหตุให้ E01 ตามการเปลี่ยน ไม่ส่งข้อมูลให้ E02 | ต้องเพิ่ม notification test | Not run |
| FR-11.03 | BR-02 | UC-11 | Reminder/Notification | TC-11 | Integration | 3 | TC-PREP-FR-11.03 | ยา E01 ถูกแก้แล้ว | E01 อ่านรายการ | แสดงข้อมูลล่าสุด | ต้องเพิ่ม end-to-end | Not run |
| NFR-01 | BR-03 | UC-08 | Frontend | TC-10 | System/Inspection | 3 | TC-PREP-NFR-01 | มีรายการหน้าและเกณฑ์ WCAG ที่ตกลง | ทดสอบ contrast/zoom/label/focus/keyboard | ผ่านทุกเกณฑ์ในรายการตรวจที่กำหนด | ESLint ไม่แทน accessibility runtime | Not run |
| NFR-02 | BR-03 | UC-01–11 | Frontend | TC-09 | Acceptance | 3 | TC-PREP-NFR-02 | ผู้สูงอายุสมัครใจและชุดภารกิจที่อนุมัติ | บันทึก task success/time/error/SUS | ≥80% ทำชุดภารกิจหลักครบโดยไม่ช่วย; SUS แยกบทบาทไม่มี threshold | SUS เดิมไม่ยืนยัน NFR | Not run |
| NFR-03 | BR-01 | UC-02,03 | Notification | TC-02 | System | 4 | TC-PREP-NFR-03 | 100 เหตุ eligible และอุปกรณ์/เวลาอนุมัติ | วัดเหตุถึง device ตาม event ID | ≥95/100 ภายในกรอบเวลา TBD-02; Academic live blocked | ต้องมี device evidence | Not run |
| NFR-04 | BR-01,02 | UC-04–06 | Reminder/Web | TC-03 | System | 3 | TC-PREP-NFR-04 | เครือข่ายปกติที่นิยามและ event fixture | วัดเวลายืนยันถึงผู้ดูแลเห็น | รายงาน p50/p95; เกณฑ์เสนอ p95 ≤5s รอตกลง | TBD-02 | Not run |
| NFR-05 | BR-02,03 | UC-01,07,09–11 | ทุกบริการ | TC-04 | Integration/Inspection | 3 | TC-PREP-NFR-05 | บัญชีจำลองทุกบทบาทและ secret จำลอง | ทดสอบ cross-account/revocation และตรวจ log | ปฏิเสธทุกกรณีที่ไม่มีสิทธิ์และไม่พบ secret | auth/IDOR/guard tests partial | Not run |
| NFR-06 | BR-01,02 | UC-03,09 | Frontend/Notification | TC-05 | System | 3 | TC-PREP-NFR-06 | device/browser matrix ที่อนุมัติ | ทดสอบ install/icon/offline/notification ตามขอบเขต | ผ่านภารกิจที่ประกาศรองรับ; แสดงข้อจำกัดจริง; push live blocked | device matrix TBD-04 | Not run |
| NFR-07 | BR-03 | UC-08 | Voice | TC-06 | Acceptance/System | 4 | TC-PREP-NFR-07 | ผู้สูงอายุ 10 คนและชุดคำสั่งเดียวกันที่อนุมัติ | วัด intent/response ถูกต้องและปุ่มสำรอง | ≥80% ตามตัวหารที่กำหนดและ fallback ใช้ได้ | voice unit ไม่เท่ากับ speech/UAT | Not run |
| DR-01 | BR-02,03 (เสนอ) | — | ทุกบริการ | TC ใหม่ | Inspection/Integration | 3 | TC-PREP-DR-01 | รายการข้อมูลจำเป็นที่อนุมัติ | ตรวจ payload/schema/storage | ไม่เก็บหรือส่งฟิลด์เกินรายการ | ต้องเพิ่ม data inventory | Not run |
| DR-02 | BR-02 (เสนอ) | UC-07 | Auth/ทุกบริการ | TC-04 (เสนอ) | Integration | 3 | TC-PREP-DR-02 | C02 ไม่มี consent | อ่าน/แก้ E01 | ปฏิเสธไม่เปลี่ยนข้อมูล | IDOR tests partial | Not run |
| DR-03 | BR-02 (เสนอ) | — | DB/Notification | TC ใหม่ | Inspection/Integration | 3 | TC-PREP-DR-03 | retention/deletion policy ที่ตกลง | สร้างข้อมูลจำลองเกินและไม่เกินอายุ | ลบเฉพาะที่เข้าเกณฑ์และไม่ลบเกิน | retention.test partial; TBD-05 | Not run |
| DR-04 | BR-02,03 (เสนอ) | — | Academic environment | TC ใหม่ | Inspection/Unit | 3 | TC-PREP-DR-04 | แยก consent สำหรับทดสอบและ fixture จำลอง | ตรวจ environment และข้อมูล | ไม่มีข้อมูลจริงและสิทธิ์ production | academic-db/network partial | Not run |
| DR-05 | BR-02,03 (เสนอ) | — | ทุกบริการ | TC ใหม่ | Inspection/Integration | 3 | TC-PREP-DR-05 | ข้อมูลลับจำลองและเหตุ error | ตรวจ output/log/evidence | ไม่พบ secret/ข้อมูลบัญชีจริง | ต้องตรวจ log test | Not run |
| UI-01 | BR-03 (เสนอ) | UC-08 | Web | TC-10 (เสนอ) | System | 3 | TC-PREP-UI-01 | เสียงใช้ไม่ได้ | ทำภารกิจด้วยปุ่ม | ปุ่มสำรองทำภารกิจได้ | ต้องเพิ่ม UI case | Not run |
| UI-02 | BR-03 (เสนอ) | UC-08,10 | Web/Voice | TC-06 (เสนอ) | System | 4 | TC-PREP-UI-02 | คำสั่งเปลี่ยนข้อมูล | สังเกต preview และยกเลิก/ยืนยัน | แสดงค่าที่เข้าใจและไม่บันทึกก่อนยืนยัน | voice parser partial | Not run |
| UI-03 | BR-02,03 (เสนอ) | UC-09 | Web | TC-08 (เสนอ) | System | 4 | TC-PREP-UI-03 | network/pิกัด/SOS ล้มเหลว | เปิดหน้าสถานะ | แสดงสถานะตามจริง ไม่แสดง success ปลอม | mobile SOS supplemental | Not run |
| UI-04 | BR-03 (เสนอ) | UC-08 | Web | TC-10 (เสนอ) | Inspection/System | 3 | TC-PREP-UI-04 | ชุดหน้าที่ประกาศตรวจ | ประเมินเกณฑ์ NFR-01 | ผ่านรายการเกณฑ์ที่กำหนด | ต้องเพิ่ม WCAG matrix | Not run |
| SI-01 | BR-01,02 (เสนอ) | UC-03,09 | Notification | TC-02,08 (เสนอ) | Integration | 4 | TC-PREP-SI-01 | mock provider พร้อมและล้มเหลว | ส่งเหตุและตรวจผล | ผลรับคำขอตรง mock; ไม่อ้าง delivery จริง | live push blocked | Not run |
| SI-02 | BR-03 (เสนอ) | UC-08,10 | Voice/AI | TC-06,07 (เสนอ) | Integration | 3 | TC-PREP-SI-02 | provider/fixture ที่อนุมัติ | ส่งคำสั่งที่อยู่และนอกสิทธิ์ | ส่งเฉพาะข้อมูลที่อนุญาต; fallback เมื่อ error | provider TBD-04 | Not run |
| SI-03 | BR-02 (เสนอ) | UC-09 | Web/Notification | TC-08 (เสนอ) | Integration | 4 | TC-PREP-SI-03 | จำลองอนุญาต/ปฏิเสธตำแหน่ง | ส่ง SOS | Full: ตาม consent; Academic: ไม่รับ location fields | Academic blocked; guard negative | Not run |

## ขยายกรณีสำคัญก่อน CP3
| ID เตรียม | เทคนิค | input/เงื่อนไข | Expected |
|---|---|---|---|
| BND-01 | Boundary | 00:00, 23:59, 24:00, นาที 60 | รับเฉพาะเวลาที่ถูกตาม format; ไม่ตี invalid เป็น 00:00 |
| BND-02 | Equivalence | วันเริ่มวันนี้/พรุ่งนี้, วันสิ้นสุดวันนี้/เมื่อวาน, weekday ที่ไม่เลือก | เฉพาะตารางที่เข้าเกณฑ์ถึงกำหนด |
| STATE-01 | State transition | Pending→Taken/Snoozed/Missed, คำขอซ้ำ | เปลี่ยนตาม state ที่ตกลง; ไม่ duplicate |
| AUTH-01 | Decision table | guest, owner, linked, unlinked, revoked × read/write | deny ตามสิทธิ์; no data leak/no side effect |
| RETRY-01 | Concurrency/failure | scheduler tick ซ้อน, timeout, retry | ไม่ประมวลผล lane ซ้ำ; ฟื้นได้; event idempotency ตรวจแยก |
| SOS-01 | Error path | message-only, location fields, network failure | local SOS ตามข้อจำกัด; พิกัดถูกปฏิเสธ; ไม่ fake success |
| RESTORE-01 | Recovery | fixture DB disposable, backup/restore ใหม่ | row count/checksum และ referential integrity ตรง; ไม่แตะฐานเดิม |
| UAT-01 | Task-based | ผู้สูงอายุสมัครใจ: เพิ่มยา/ดูเตือน/ยืนยัน/ขอความช่วยเหลือจำลอง; ผู้ดูแล: เชื่อมและติดตาม | บันทึกสำเร็จ/เวลา/ข้อผิดพลาดต่อภารกิจ; ไม่มีข้อมูลจริงในหลักฐาน |

## Review gates
- ตกลง BR/priority ของ DR/UI/SI; ทุก FR มี GWT ในร่าง แต่ยังต้องแปลงถ้อยคำ EARS ให้ตรงเอกสารจริงและทบทวน expected ตาม source/requirement
- แยก test ID ราย positive/negative/boundary และกำหนด fixture, steps, cleanup, oracle, environment และ evidence ตามแม่แบบ CP3 เมื่อได้รับ
- ไม่ถือว่ามี test executable หรือผ่านเพียงเพราะมี candidate row; ผลจริงกรอกใน CP4 หลังรัน
