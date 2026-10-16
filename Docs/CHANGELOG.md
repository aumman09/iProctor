# Changelog

รูปแบบ: ใหม่สุดอยู่บนสุด · ทุกครั้งที่แก้ระบบให้เพิ่มรายการที่นี่ (ระบุไฟล์สำคัญที่เกี่ยวข้อง)

## [Unreleased] ? Deploy beta
### Added
- Deploy ???? beta: https://iproctor.beta.mfu.ac.th (??????????? 192.168.11.90, `/opt/iproctor-beta`)
- `Dockerfile` (3 stage + stage `tools` ?????? migrate/seed), `docker-compose.beta.yml` (project `iproctor-beta`: db + web + setup), `.dockerignore`
- `next.config.ts`: `output: "standalone"`
- Nginx vhost `/etc/nginx/sites-available/iproctor.beta.mfu.ac.th.conf` ? proxy 192.168.11.90:8098 (cert wildcard ???????? PTS)

## [Unreleased] — 2026-10-06 — v2 scope (Portal, Seating, Custom Audio)
### Added
- Mock Login (FR-01.2): `src/app/login/` (server action), `src/lib/server/auth.ts` (cookie `iproctor_session`)
- Proctor Portal (FR-02): `src/app/portal/page.tsx`, API `GET /api/v1/proctor/duties`
- Seating chart (FR-03): `src/components/SeatingChart.tsx`, `SeatingOverlay.tsx`, API `GET /api/v1/exam-rooms/{roomId}/seating`, `src/hooks/useRoomLayout.ts`
- Pre-Exam Mode: ผังที่นั่งเต็มจอช่วง T-15 → T-0 + ปุ่ม "ผังที่นั่ง" ใน `ControlBar`
- หน้า `/seating/[roomId]` (สาธารณะ) แสดงผังที่นั่ง (เคยมี QR Code — ถูกลบแล้ว ดูหัวข้อ Removed)
- Custom start-instruction audio (FR-04): `audio-engine.ts`, `src/lib/custom-audio-store.ts` (IndexedDB), ปุ่มเลือก/ฟัง/ลบใน `ControlBar`
- Types v2 ใน `src/lib/types.ts` (`ProctorDuty`, `SeatingRow`, `RoomLayoutResponse`, `AuthUser`)
- `Docs/HANDOFF.md`, `Docs/CHANGELOG.md`
### Removed
- QR Code บนผังที่นั่ง และ dependency `qrcode.react` (ผู้ใช้ไม่ใช้ — ข้อ Recommendation 3 ในสเปกถูกยกเลิก)
### Added
- นำเข้าผังห้องสอบครบ 131 ห้อง 10 อาคาร (`data/seating/*.json`) จาก PDF สำนักทะเบียนชุด 27 ก.ย. 2026; C3-101/C3-107 ใช้ผังจริงแทนที่ทำมือ (ชื่อวิชาในคำอธิบายผังหายไปจนกว่าจะต่อ Blendata); ตัวแปลงรองรับโต๊ะที่วาดด้วยเส้น 4 เส้น (C3), เก้าอี้ขนาดใหญ่ถึง 50pt (C2), และหาไวท์บอร์ดจากแถบชิดผนังเมื่อไม่มีป้าย (D1 — ควรตรวจ)
- ผังที่นั่งแสดงเป็นโต๊ะ/เก้าอี้ตามผังจริง: ตัวแปลงดึงโต๊ะ (สี่เหลี่ยมขาวที่มีเลขที่นั่ง), เก้าอี้ (รูปโค้ง; มีไอคอนคน = ที่นั่งสอบ), ไวท์บอร์ด เป็นพิกัดจริงหลังหมุน; `RoomLayoutResponse` เปลี่ยนจากกริดเป็น `size` + `seats/desks/chairs` (พิกัด pt) + `whiteboard`, `labelSize`, `rowLabels[{label,x,y}]`; `SeatingChart` วาดแบบ absolute ตามสัดส่วนห้อง (ตัวอักษรใช้ cqw, จอเล็กเลื่อนแนวนอน, จอโปรเจกเตอร์ใช้ความสูงที่เหลือใต้นาฬิกา) เก้าอี้ที่ใช้ระบายสีตามกลุ่ม เก้าอี้ว่างเป็นเส้นประ; แปลง C3-101/C3-107 เป็นรูปแบบใหม่ (ตำแหน่งประมาณ)
- ตัวแปลง PDF ผังที่นั่งของสำนักทะเบียน → JSON: `scripts/seating/import_pdf.py` (PyMuPDF) อ่านชื่อห้อง, ที่นั่ง+พิกัด, สีชมพู/ขาว, ไวท์บอร์ด, ผนัง/ประตู, ป้าย "Row n" แล้วหมุนให้หน้าห้องอยู่บน; มีรายงานสิ่งที่ต้องตรวจ
- ผังห้อง C5 ทั้ง 22 ห้อง (`data/seating/C5-*.json`) จาก `C5_20260927133423.pdf`
### Changed (ผังหน้าห้องด้านบน & เสียงชุดใหม่)
- ผังที่นั่งบนจอโปรเจกเตอร์แสดงหน้าห้อง (โปรเจกเตอร์/ไวท์บอร์ด) ด้านบนเสมอ — เลิกหมุนกลับเป็นแนวกระดาษ (`toPaperOrientation` ถูกลบ)
- เสียง `02_exam_rules.mp3` ชุดใหม่ (130 วินาที); `DEFAULT_RULES_CUES` = [0, 6.3, 29.9, 38.4, 54.3, 70.8, 93, 113.5] เลื่อนจากค่าที่ซิงก์ไว้บน beta ตามช่วงเงียบของไฟล์ใหม่
### Changed (popup ครบ 45 นาที)
- popup "45 minutes have elapsed" ปิดเองหลัง 10 วินาที (ปุ่ม Dismiss แสดงนับถอยหลัง) — `Alert.autoDismissMs` ใน `AlertCenter`
### Changed (กลุ่มเรียน & เสียงระเบียบการสอบ)
- หลายกลุ่มเรียน (sec) ของวิชาเดียวกัน เวลาเดียวกันในห้องเดียว รวมเป็นการ์ด/ตัวจับเวลาเดียว แสดง "Sec n · Seats a – b" เรียงลง 3 แถวแล้วขึ้นคอลัมน์ใหม่; เอาป้าย Sec ด้านบนชื่อวิชาออก — `CourseCard`, `groupSections` ใน `data-source.ts`
- ช่วงที่นั่งรายกลุ่มเรียน: `slot_courses.seat_from / seat_to` (migration `0003_section_seats`), `ImportBatch` รับ `seatFrom/seatTo`; ไม่ระบุ = ช่วงของกลุ่มในผังห้อง; "Mark as completed" ตั้งสถานะทุก sec ของการ์ดพร้อมกัน; demo แบ่ง 3 sec เมื่อกลุ่มที่นั่งเกิน 30 ที่; seed E3B-101 มี 4 sec
- เสียงระเบียบการสอบ: อ่านจบ → รอ 2 วินาทีแล้วกลับหน้าจอคุมสอบเอง; ปิดหน้าระเบียบการสอบ = หยุดเสียงทันที (`AudioEngine.stopRules / isPlayingRules`)
- โหมดจำลอง: ไม่แสดงวงเล็บว่างในป้ายเหตุการณ์ของห้องที่เลขที่นั่งไม่มีตัวอักษรนำ
### Changed (ภาษาอังกฤษ, ระเบียบการสอบ, จอ 4:3)
- หน้าระเบียบการสอบ: ประกาศคณะอนุกรรมการควบคุมการสอบ 6 ข้อ + คำเตือน (อังกฤษบน ไทยสีเทาล่าง, ตัว F สีแดง) หน้าเดียวไม่มีแถบเลื่อน — ข้อความอยู่ที่ `src/lib/exam-rules.ts`
- ไฮไลต์ข้อที่เสียง `02_exam_rules.mp3` กำลังอ่าน (`AudioEngine.rulesPosition()`, เฉพาะไฟล์มาตรฐาน); เวลาเริ่มแต่ละช่วงเก็บใน `app_settings.rules_cues` ส่งทาง `RoomSchedule.rules_cues` — ค่าเริ่มต้นเป็นค่าประมาณ ซิงก์ได้ที่ Admin → Settings → Exam rules audio sync (`RulesSyncForm`)
- ทั้งระบบเป็นภาษาอังกฤษ (ยกเว้นข้อความไทยในประกาศระเบียบการสอบ) วันที่เป็นรูปแบบ en-GB; เมนู Admin "Alert timing" เปลี่ยนเป็น "Settings"
- การ์ดรายวิชา: รหัสวิชาตัวหนาสีดำ, แสดงช่วงเลขที่นั่งจากผังห้อง ("Seats A1 – A80", `seat-range.ts`) แทนช่วงรหัสนักศึกษา, ปุ่ม Mark as completed ย้ายไปใต้เวลา, แถว Exam Office note แสดงเมื่อมีเท่านั้น
- จอ 4:3: นาฬิกา/การ์ด/ระยะห่างย่อตามความสูงจอ; โหมด Full screen ซ่อนแถบควบคุม (ชี้ขอบล่างเพื่อแสดง) และล็อกความสูงจอ; มีประกาศบนจอ → ย่อนาฬิกา; ผังที่นั่งเต็มจอบนจอ < 3:2 ใช้แถบชื่อห้อง+เวลาด้านบน ผังเต็มความกว้าง — ตรวจแล้วพอดี 1024×768, 1400×1050, 1920×1080 (800×600 ยังล้นเล็กน้อยเมื่อมีประกาศ/ในหน้าระเบียบ)
### Added (ไฟสถานะหน้าจอคุมสอบ)
- หน้าจอคุมสอบส่ง heartbeat ทุก 1 นาที (`POST /api/v1/exam-rooms/{roomId}/heartbeat`, ไม่ส่งในโหมดจำลองเวลา/demo) → `exam_slots.screen_opened_at / screen_last_seen_at / screen_opened_by` (migration `0002_screen_heartbeat`)
- Admin: ไฟเขียวกะพริบ "กำลังคุมสอบ · เปิด HH:MM" เมื่อมีสัญญาณภายใน 3 นาที, ไฟเทา "ปิดหน้าจอแล้ว" เมื่อขาดสัญญาณ (hover ดูผู้เปิด/สัญญาณล่าสุด) — หน้า รอบสอบ & รายวิชา และรอบสอบวันนี้ใน Dashboard; การ์ด "ห้องที่กำลังคุมสอบตอนนี้"; หน้า Admin รีเฟรชข้อมูลเองทุก 30 วินาที (`AutoRefresh`)
### Added (Admin Panel & ยืนยันสอบเสร็จ)
- Admin Panel `/admin` (เฉพาะ role admin, login Admin แล้วเข้าหน้านี้ทันที; portal มีปุ่ม Admin Panel): เมนูด้านซ้าย (มือถือเป็นแถบบน) — `src/app/admin/`, `src/components/admin/`
  - ภาพรวม: รายวิชาส่งข้อสอบแล้ว x/y (+ แถบความคืบหน้า), รอบสอบที่ส่งครบ, เปิดหน้าจอคุมสอบวันนี้, ผู้ใช้งาน 7 วัน, รอบสอบวันนี้พร้อมสถานะรายวิชา, กราฟการใช้งานรายวัน 7 วัน, กิจกรรมล่าสุด
  - รอบสอบ & รายวิชา: กรองช่วงสอบ/วันที่/รอบ/สถานะ/ค้นหา, สถานะส่งข้อสอบ (เวลา + ผู้กด) ตั้ง/ยกเลิกแทนได้, **ข้อกำหนดเพิ่มเติมรายวิชา** (แสดงบนการ์ดรายวิชาในหน้าจอคุมสอบ "Exam Office note")
  - ห้องสอบ: 131 ห้องแยกอาคาร, ดูผัง, **จำลองหน้าจอ** (`/room/<ห้อง>?…&demo=1` ตารางจำลองจากผังห้อง — ห้องที่ไม่มีรอบสอบก็ทดสอบได้)
  - เวลาแจ้งเตือน: เปิดห้องก่อนเริ่ม, ออกห้องหลังเริ่ม, เตือนก่อนหมดเวลา (เพิ่มได้สูงสุด 5 ค่า) + ตัวอย่างไทม์ไลน์ — เก็บใน `app_settings`, ส่งไปหน้าจอคุมสอบทาง `RoomSchedule.timing` (`schedule-engine` ใช้ค่าจากนี้)
- หน้าจอคุมสอบ: ปุ่ม "Mark as completed" ต่อรายวิชา + popup ยืนยันภาษาอังกฤษ (`CompletionDialog`), แสดง "Completed · เวลา" และ Undo — API `POST /api/v1/slot-courses/{id}/completion` (ต้อง login: Admin หรือผู้คุมสอบของรอบนั้น)
- Portal: ปุ่ม "เพิ่มลงปฏิทิน" (mockup: Google / Outlook / .ics ยังไม่เปิดใช้) — `AddToCalendarButton`
- บันทึกการใช้งาน `usage_events` (login, portal, เปิดจอคุมสอบ, ดูผัง, ยืนยันสอบเสร็จ, แก้ข้อกำหนด/ตั้งค่า) — `src/lib/server/usage.ts`
- ฐานข้อมูล: migration `0001_admin_completion` — `slot_courses.admin_note/completed_at/completed_by`, ตาราง `usage_events`, `app_settings`
### Changed (Admin Panel)
- นำเข้าข้อมูลช่วงสอบ upsert รายวิชาตาม (รอบ, วิชา, กลุ่มเรียน) แทนการลบแล้วสร้างใหม่ → ข้อกำหนดของ Admin และสถานะสอบเสร็จไม่หายเมื่อดึงซ้ำ
- `db:seed` แต่ละรอบใช้ห้อง/ผังต่างกัน (C5-302, C2-402, C3-107, C5-318, E3B-101 ฯลฯ) + 10 รอบสอบวันนี้/พรุ่งนี้ให้ dashboard มีข้อมูล
- ป้ายเตือนในโหมดจำลอง/popup ใช้จำนวนนาทีจริงตามการตั้งค่า
### Added (footer)
- `SiteFooter` ในหน้า login / portal / ผังที่นั่ง (ไม่แสดงบนจอฉายในห้องสอบ): "© 2026 Centre for Digital Technology and Information, Mae Fah Luang University" · "Developed by the iProctor Team · Inspired by School of Science, MFU"; แก้ line ending `

` ที่เสียใน `portal/page.tsx`
### Added (ทดสอบสถานการณ์)
- ปุ่ม "ทดสอบสถานการณ์" ใน `ControlBar` เปิดแผงยิงเหตุการณ์ทันที: เปิดห้อง (+ผังเต็มจอ), เริ่มสอบ (+ระเบียบการสอบ), ครบ 45 นาที, เหลือ 10 นาที / หมดเวลา แยกรายวิชา — เล่นเสียงและ popup จริง ไม่เปลี่ยนเวลา/สถานะรอบสอบ (`testEvent` ใน `RoomController`)
### Changed (หมดเวลา / ไฟล์เสียง)
- popup หมดเวลาเป็นภาษาอังกฤษ: "Time is up · Seat X · รหัสวิชา" + "Time is up. Please put down your pen and remain seated until all answer sheets are collected." (+ แจ้งกลุ่มที่ยังสอบต่อ) พร้อมเสียง `chime_timeout`
- `AudioEngine.load` ลองไฟล์ .mp3 → .m4a → .mp4 → .wav ตามชื่อ cue (รองรับ `chime_timeout.mp4`)
### Changed (ระเบียบการสอบ)
- ระเบียบการสอบเป็นหน้าเดียว ภาษาอังกฤษ 7 ข้อตามประกาศ "Before the Exam Starts" พร้อมไอคอน (ข้อทุจริตเน้นสีแดง) (ไม่แสดงข้อปฏิบัติรายวิชา) ไม่หมุนสไลด์; ปิดปุ่ม "N" ของ Next.js ตอน dev (`devIndicators: false` ใน `next.config.ts`) ขนาดตัวอักษรตามความสูงจอ ไม่มีแถบเลื่อน; ตรงกับเสียง `02_exam_rules.mp3` — `src/components/InstructionSlides.tsx`
### Changed (เสียง)
- ครบ 45 นาที / เหลือ 10 นาที: กระดิ่งครั้งเดียว ไม่มีเสียงพูด (chime สังเคราะห์ 784 Hz / 659 Hz, 1.2 วินาที) ไม่ต้องมีไฟล์; `AudioEngine.enqueue` ไม่เล่นซ้ำเมื่อเหตุการณ์เดียวกันเกิดพร้อมกันหลายวิชา — `src/lib/audio-engine.ts`, `public/audio/README.md`
### Added (Live Proctor Notes — FR-05.4)
- ปุ่ม "ประกาศ / โน้ต" ใน `ControlBar` เปิดหน้าต่างพิมพ์ประกาศ (สูงสุด 500 ตัวอักษร, Ctrl+Enter = แสดงบนจอ, Esc = ปิด, ซ่อน/แสดงข้อความเดิม, ลบ) → กล่องประกาศสีเหลืองตัวใหญ่ระหว่างนาฬิกากับการ์ดรายวิชา และในผังที่นั่งเต็มจอ (ใต้นาฬิกา) — `src/components/ProctorNotes.tsx`
- `useProctorNotes`: เก็บใน localStorage ของเครื่องฉาย key `notes:<ห้อง>:<วันที่>:<รอบ>` (โหมดจำลองต่อท้าย `:sim`) ไม่หายเมื่อรีเฟรช
### Added (ฐานข้อมูล)
- PostgreSQL 17 (`docker-compose.yml`, พอร์ต 5433) + Drizzle ORM: `src/lib/server/db/schema.ts` (staff, exam_periods, rooms, room_layouts, courses, exam_slots, slot_courses, proctor_assignments, import_runs), migration `drizzle/0000_init.sql`, `.env.example`
- นำเข้าข้อมูล: `src/lib/server/import/batch.ts` (`ImportBatch` + `importBatch` แทนที่ทั้งช่วงสอบใน transaction, ข้ามห้องที่ไม่มีผัง/ผู้คุมสอบที่ไม่รู้จัก/แจ้งกลุ่มที่นั่งที่ไม่มีในผัง, สีป้ายใช้สีกลุ่มในผังเมื่อไม่ระบุ, บันทึก `import_runs`), `layouts.ts` (ผังห้องมีเวอร์ชัน, เทียบ JSON แบบเรียง key), `blendata.ts` (stub รอเอกสาร API)
- สคริปต์ (tsx, `.mts`): `db:up`, `db:migrate`, `db:generate`, `db:layouts`, `db:seed` (ข้อมูลตัวอย่างอิงวันนี้ แทน mock เดิม), `db:setup`, `import:exam -- --file | --blendata`
### Changed (ฐานข้อมูล)
- `data-source.ts` อ่านจากฐานข้อมูลแทน mock: เวร (อาจารย์เห็นเฉพาะของตัวเอง, Admin/ค้นหาห้องเห็นทั้งหมด), ตารางรอบสอบ, my-assignment, ผังห้องเวอร์ชันปัจจุบัน, `getExamPeriods()`; `ExamPeriod` เป็น string และ portal โหลดรายการช่วงสอบจากฐานข้อมูล (ค่าเริ่มต้น = ช่วงที่ยังไม่จบ)
- `SeatingOverlay` ใส่ชื่อวิชา/ช่วงรหัสของรอบนี้ลงคำอธิบายผัง (ผังจาก PDF ไม่มีชื่อวิชา); portal ซ่อน "· แถว" เมื่อเลขที่นั่งไม่มีตัวอักษรนำ
### Changed
- จอโปรเจกเตอร์: ห้องที่หมุนแล้วกลายเป็นแนวตั้ง (ไวท์บอร์ดอยู่ซ้าย/ขวาในต้นฉบับ) แสดงตามแนวกระดาษต้นฉบับแทน (`toPaperOrientation` ใน `SeatingChart`) พร้อมป้าย "หน้าห้อง (ไวท์บอร์ด) อยู่ด้านซ้าย/ขวา" — ผังกว้างเต็มจอ ตัวเลขใหญ่ขึ้น (C5-302 บน 1080p: 9.7px → 14.9px); หน้าเว็บ /seating ยังหมุนให้หน้าห้องอยู่บน; `fitLabelPt` รองรับเลขที่ซ้อนแนวตั้งในโต๊ะเดียว
- ผังที่นั่งต้องอยู่ในจอเดียวเสมอ ไม่มีแถบเลื่อน (ฉายให้นักศึกษาดูก่อนสอบ): `SeatingChart` โหมด large ย่อตามพื้นที่ที่เหลือจริงด้วย container query (`min(100cqw, (100cqh − ป้ายหน้าห้อง) × สัดส่วนห้อง)`), หน้าเว็บย่อตามความสูงจอ; ตัวเลขที่นั่งใหญ่ที่สุดที่ยังอยู่ในโต๊ะ/เก้าอี้ของตัวเอง (`fitLabelPt`); `SeatingOverlay` จอแนวนอนวางนาฬิกาด้านซ้าย ผังด้านขวาเต็มความสูง, นาฬิกา compact ย่อด้วย cqw (`OfficialClock`) — C3-107 บนจอ 1920×1080 กว้าง 1296px (เดิม 927), 1280×720 กว้าง 813px (เดิม 333)
- `RoomLayoutResponse` เปลี่ยนเป็นพิกัดกริด: `grid`, `seats[{id,x,y,group}]`, `doors[{wall,at}]`, `rowLabels?`, `source?` (แทน `rows[].blocks` + `projectorPosition`/`doorPositions`) เพราะห้องจริงหันได้ทุกทิศและจัดโต๊ะต่างกัน; `groups[].courseName/studentIdRange` เป็น optional; แปลง `C3-101`, `C3-107` เป็นรูปแบบใหม่
- `SeatingChart` วาดตามพิกัด: กรอบห้อง, ไวท์บอร์ดด้านบน, ทางเดินแคบลง, ไอคอนประตูบนผนังตามตำแหน่งจริง, คำอธิบายกลุ่มพร้อมจำนวนที่นั่ง; `useRoomLayout` ตรวจ cache ด้วย `seats`
- README.md เขียนใหม่ให้ตรงกับ v2: flow login → portal → room/seating, ตารางหน้าและสิทธิ์ login, ไทม์ไลน์หน้าจอคุมสอบ, โหมดจำลองเวลา, ข้อมูลที่ต้องเตรียม (ผังที่นั่ง/เสียง), โครงสร้างโปรเจกต์, งานค้าง
- ผังที่นั่งรีดีไซน์ตามผังจริงของสำนักทะเบียน (ห้อง C3 101): `RoomLayoutResponse` เปลี่ยนจาก `rowLabels` + `columns[]` เป็น `groups[]` + `rows[].blocks` (เลขที่นั่งระบุตรง ๆ, `null` = เก้าอี้ว่าง, `disabledSeats` ย้ายไประดับห้อง); `SeatingChart` เปลี่ยนจากพื้นน้ำตาลเข้มเป็นการ์ดขาวโทน slate, ที่นั่งสีอ่อนตามป้าย, ป้ายแถวสองฝั่ง, ประตูหน้า/หลังตามตำแหน่ง, คำอธิบายกลุ่มพร้อมช่วงเลขที่นั่ง; เพิ่ม `data/seating/C3-101.json`, แปลง `C3-107.json` เป็นรูปแบบใหม่; หน้า `/seating` กว้างขึ้น (max-w-4xl); `useRoomLayout` ไม่ใช้ cache รูปแบบเก่าตอนออฟไลน์ — `src/components/SeatingChart.tsx`, `src/lib/types.ts`, `data/seating/`
- Portal รีดีไซน์ (ลดสีที่ขัดกัน): ทั้งหน้าใช้โทน slate, เขียว emerald ใช้เฉพาะเวรที่เปิดอยู่ (ขอบการ์ด, ป้าย "กำลังสอบ", ปุ่ม Launch), แดง MFU เหลือแค่โลโก้; ตัดแถบ "เข้าห้องสอบปัจจุบัน" ที่ซ้ำกับการ์ด แล้วแบ่งส่วนเป็น "ตอนนี้" / "เวรถัดไป" / "เวรที่ผ่านไปแล้ว" (หุบไว้ล่างสุด); การ์ดมีบล็อกวันที่ + ไอคอนเวลา/ห้อง; ป้ายวิชาเป็นสีกลาง + จุดสีประจำแถว (เพิ่ม `dot` ใน `SEAT_THEME`); ป้ายสถานะเป็นภาษาไทย — `src/app/portal/page.tsx`, `src/components/seat-theme.ts`
- Portal: เวรที่ `COMPLETED` ถูกรวมไว้ในกล่องหุบ "เวรที่ผ่านไปแล้ว (n)" (ปิดเป็นค่าเริ่มต้น, ใช้ `<details>` ไม่ต้องใช้ JS)
- `SeatingOverlay` แสดงนาฬิกาใหญ่ (`OfficialClock compact`) ไว้ด้านบน เหนือผังที่นั่ง เพื่อให้นักศึกษาเห็นทั้งเวลาและผัง
- Portal: การ์ดเวร LIVE / ป้ายสถานะ / แถบ "เข้าห้องสอบปัจจุบัน" ใช้เขียวอ่อน (emerald-50/200) คุมโทน, ปุ่ม Launch เขียวเข้ม (ลองแดง/ดำแล้ว ผู้ใช้เลือกเขียวอ่อน)
- ผังที่นั่งเปลี่ยนเป็นกริด (คอลัมน์ "แถว n" × แถวนอน "ตอน n" ตามแบบอ้างอิง) — `RoomLayoutResponse` เปลี่ยนเป็น `rowLabels` + `columns[]` (ต่างจากสเปก §3.2)
- ผังรายห้องอ่านจากโฟลเดอร์ `data/seating/<ROOM_ID>.json` (`getRoomLayout`), มี `data/seating/README.md`
- เพิ่มปุ่มย้อนกลับ: `components/BackButton.tsx` (หน้า /seating) และปุ่มลูกศรใน `Header` (หน้าห้องสอบ → /portal)
- `/` redirect ไป `/portal` หรือ `/login` (เดิมพาเข้าห้องสอบตรง ๆ)
- `data-source.ts`: เพิ่ม `getProctorDuties`, `getRoomLayout` (mock)
### Known gaps
- FR-01.1 SSO จริง, Blendata API, อัปโหลดเสียงขึ้น server — ดู HANDOFF.md

## 2026-xx — Scaffold (commit d31b9b7)
- v1: หน้าจอโปรเจกเตอร์ `/room/[roomId]`, state machine, Web Worker timer, audio engine, โหมดจำลองเวลา
