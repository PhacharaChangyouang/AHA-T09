# AHA-T09 — Academic Edition

โครงงานทีม T09 | ENGSE601 Verification & Validation

ระบบผู้ช่วยแจ้งเตือนการรับประทานยาและติดตามความร่วมมือในการใช้ยาสำหรับผู้สูงอายุโดยเชื่อมโยงกับผู้ดูแล (AHA)

## สถานะ

Repository นี้เป็นฉบับสำหรับการศึกษา แยกจากระบบที่ให้บริการจริง รวม Source Code ฉบับสำหรับตรวจงานรายวิชาและเอกสารตามโครงสร้างที่กำหนด ไม่ใช่ Production release หรือการรับรองว่าทดสอบครบแล้ว

| งาน | ตำแหน่ง |
|---|---|
| D02 | [V&V Profile](docs/vv/00-vv-profile.md) |
| D03 | [Case analysis](docs/vv/01-case-analysis.pdf) |
| D04 | GitHub Issues / Labels |
| D05 | [Proposal](docs/srs/proposal.pdf) |
| SRS | [SRS-T09.pdf](docs/srs/SRS-T09.pdf) |
| SDD | [SDD-T09.pdf](docs/design/SDD-T09.pdf) |

[รายละเอียดการส่งงาน V&V](docs/vv/README.md)

## Source Code

- `frontend/` — Web / PWA
- `backend/` — Auth, Reminder, Notification
- `mobile_app/` — Flutter
- `tests/` — ชุดทดสอบ
- `docker-compose.yml` — สภาพแวดล้อมแยกสำหรับการศึกษา

## ขอบเขต

Frontend, Mobile, Auth, Reminder, Notification, Rule-based Voice Assistant และชุดทดสอบตามขอบเขตโครงงาน โดยรักษา UI ที่ผู้ใช้เห็นไว้ ระบบผู้ดูแลภายในและธุรกิจ AI รุ่นใหม่ ข้อมูลจริง และการตั้งค่า Production ไม่อยู่ในฉบับเผยแพร่

ยังไม่เชื่อมต่อ Production และห้ามใช้ Production credentials หรือข้อมูลผู้ใช้จริงในการทดสอบ ให้ใช้ข้อมูลจำลองและสภาพแวดล้อมแยกเท่านั้น

เอกสารสำหรับส่งรายวิชาอาจมีข้อมูลสมาชิกทีมและหลักฐานภายใน ห้ามเปลี่ยน Repository เป็น Public จนกว่าจะตรวจเอกสาร ภาพหลักฐาน Source Code และ Git history ทั้งหมด และได้รับอนุมัติจากเจ้าของ
