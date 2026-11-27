# SDD — Preliminary design review

> T09 · 27 พ.ย. 2569 · ฉบับเตรียมงาน (ยังไม่ใช่งานส่งและไม่ใช่ผลทดสอบ) · baseline `ac69042fc88a1b2452c242c4dbf6c9c70ef48560`

ตรวจ SDD-v0.2.docx ใน Library (29 หน้า) เทียบ SRS Word ที่มีใน main และ source Academic ที่ระบุด้านล่าง ยังไม่ได้ตรวจภาพและทุกหน้าของ PDF ที่อยู่ใน repo ให้ตรงกับร่าง Word จึงไม่สรุปว่า PDF ผ่าน

## Checklist ตามแม่แบบ SDD หน้า 22 (12 ข้อ)
| ข้อ | ผล | ตำแหน่งและงานต่อ |
|---|---|---|
| 1 อ้าง SRS ฉบับชัดเจน ไม่เขียนซ้ำ | ต้องแก้ | ปกอ้าง SRS ร่าง 0.2; Word ใน main ปก 0.1; ใช้ baseline หลัง CP1 |
| 2 ระบบภายนอกตรง C2/6.3/SRS | ตรวจบางส่วน | 3.1 และ 6.3 ระบุ Web Push, Voice/AI, Geolocation ครบในข้อความ; ต้องตรวจภาพ C2 และข้อจำกัด Academic |
| 3 container มีเทคโนโลยี หน้าที่ ลูกศรโปรโตคอล | ตรวจบางส่วน | ตาราง 3 มีเทคโนโลยี/หน้าที่; API Gateway/BFF ยังรวมชื่อ Nginx กับ BFF; ตรวจภาพลูกศรและ data flow |
| 4 NFR มีคำตอบ 2.1 | ต้องแก้ | NFR-07 ไม่ปรากฏโดยรหัสในตาราง 2; เพิ่มแนวทางวัด/ทดสอบความเข้าใจและขอบเขตภาษา |
| 5 ADR มี ≥2 ทางเลือกและข้อเสีย | พบโครงสร้าง | ADR-01–04 มีทางเลือกและผลตามมา; เพิ่มข้อเสีย/เงื่อนไขตัดสินที่วัดได้ และยืนยันว่า proposal ใดถูก implement |
| 6 deployment ตรง SRS | ต้องแก้ | 3.4 กล่าว Railway เชิงแนวคิด; Academic compose เป็น local แยกสาม DB, ไม่ใช่ topology Production |
| 7 ER ตรงข้อมูล และ DR ครบ 4.3 | ตรวจบางส่วน | logical entity ต่างจาก physical table; DR-01–05 มีแนวทาง; retention/deletion TBD-05 และ schema mapping ต้องตรวจ migration รอบใหม่ |
| 8 sequence ตรง UC main/error | ตรวจบางส่วน | SD-02/04/07/09 มีคำอธิบายและภาพ; ต้องตรวจทุกเส้น alternate/error กับ UC ทั้ง 4 และการตอบกลับจริง |
| 9 API มีผู้มีสิทธิ์และ error | ต้องแก้ | 6.2 ระบุผู้มีสิทธิ์และรหัส error แบบเสนอ แต่ยังไม่เป็นสัญญาราย endpoint; ตรวจ 401/403/404/400/409 ตามโค้ด ไม่บังคับให้ทุก endpoint ใช้รหัสเดียวกัน |
| 10 traceability ครบและ RTM เติม design | ต้องแก้ | ตาราง 13/14 รวมเป็นช่วง FR/DR/UI/SI; แยก mapping ราย ID ให้ตรง RTM 64 รายการหลัง CP1 |
| 11 version/date ตรง | ตรวจบางส่วน | ร่าง Word 0.2 มีปกและ footer 0.2; รหัสทีมยังรอยืนยันทั้งที่ T09 ทราบ; ต้องตรวจ PDF ฉบับจริง |
| 12 ลบข้อความตัวอย่าง/คำแนะนำ | ตรวจบางส่วน | ยังมีข้อเสนอและ TBD จริงที่ต้องคงไว้; ตรวจ placeholder และสารบัญเมื่อจัดฉบับส่ง |

## Source alignment ที่ยืนยันจากการอ่านไฟล์ (ไม่ใช่ผล runtime)
| ส่วน | หลักฐานบน baseline | ผล / ความต่างที่ต้องอธิบาย |
|---|---|---|
| Deployment | docker-compose.yml | compose มี api-gateway, auth/reminder/notification และ PostgreSQL 18 แยกสามบริการ; SDD ต้องแยก topology Academic จากระบบเต็ม |
| Auth | backend/auth-service/src/routes/auth.routes.js, family.routes.js (พบ path) | ยืนยันตำแหน่ง route เท่านั้น; ต้องตรวจ method, controller, ownership และ response ราย API |
| Web/PWA | frontend/src/app/api/bff/[service]/[...path]/route.js (พบ path), frontend/src/lib/voice-understanding.js (พบ path) | มี BFF และ voice parser; ไม่รับรองว่าใช้ provider AI ภายนอกหรือทุก intent ทำงานได้ |
| Notification | backend/notification-service/tests/security.test.js (อ่านชื่อ assertion), tests/security/academic-network.test.cjs | Academic delivery ถูกปิดตามชุดทดสอบ; mock result ไม่ใช่ device delivery |
| SOS | backend/notification-service/src/config/academic-sos.js, tests/security/academic-sos.test.cjs | มีข้อกำหนด Academic ไม่รับพิกัดแม้เป็นตัวเลขถูกต้อง; FR-09.02/09.04 ต้องระบุว่า blocked/out-of-scope สำหรับ baseline นี้ โดยให้ทีมอนุมัติ |
| Isolation | tests/security/academic-db.test.cjs, tests/security/academic-network.test.cjs | มีทดสอบการปฏิเสธ remote config/credential; ยังไม่ได้รัน |
| Native | mobile_app/test/sos_screen_test.dart, mobile_app/test/widget_test.dart (พบไฟล์) | Native อยู่นอก SRS ปัจจุบัน แม้มี source; ใช้เป็นหลักฐานเสริมได้หลังตกลงขอบเขต |

## ลำดับแก้ SDD
1. ตรึง SRS ที่ผ่าน CP1 แล้วปรับ header/footer/revision/T09
2. แยก C2 และ deployment แบบ Full AHA กับ Academic; ตรวจ C3 และโปรโตคอล/ความรับผิดชอบ
3. ทำ physical schema mapping จาก migration ทั้ง 3 บริการ; ยืนยัน constraint, ownership, duplicate และความหมาย delivered_at
4. ตรวจ SD-02/04/07/09 ทีละเส้น; เพิ่ม SD เฉพาะที่ SRS ต้องการและเก็บแผนภาพ editable เมื่อมี
5. ทำ API inventory method/path/role/owner/input/error/output จาก source; แยก design goal vs implemented
6. เติม RTM รายข้อและ cross-reference; ใช้ checklist ครั้งที่ 4 พร้อมผลทบทวนจริง

ร่างนี้ไม่ใช่ D09 หรือผลทบทวนจากทีมอื่น: ยังไม่ได้รับโจทย์ D09 ฉบับเต็ม และไม่เปลี่ยน SDD PDF เดิม
