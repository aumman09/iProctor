# iProctor MFU — Handoff Guide (สำหรับ AI/ผู้พัฒนาคนถัดไป)

อ่านไฟล์นี้ก่อนเริ่มงานทุกครั้ง แล้วดู [CHANGELOG.md](./CHANGELOG.md) เพื่อรู้ว่าทำอะไรไปแล้ว
สเปกหลัก: [iproctor_mfu_technical_requirements.md](./iproctor_mfu_technical_requirements.md) (v2.0.0)

## กติกาการทำงาน
- ทุกครั้งที่ทำงานเสร็จ: เพิ่มรายการใน `Docs/CHANGELOG.md` และอัปเดตตารางสถานะด้านล่าง
- **Next.js 16 ไม่เหมือนที่เคยรู้** (ดู `AGENTS.md`) — อ่าน `node_modules/next/dist/docs/` ก่อนใช้ API: `cookies()` เป็น async, `PageProps<"/route">` / `RouteContext<...>` ถูก generate ตอน `npm run build`/`next dev` (ก่อนหน้านั้น `tsc` จะฟ้อง error ว่า route ไม่รู้จัก — ปกติ)
- ไฟล์ในโปรเจกต์ใช้ CRLF; ถ้าแก้ด้วยสคริปต์ระวังการ match ข้อความหลายบรรทัด
- ตรวจก่อนจบงาน: `npm run lint` และ `npm run build`

## Stack
Next.js 16 (App Router) · React 19 · Tailwind 4 · lucide-react · PostgreSQL 17 (docker compose, พอร์ต 5433) + Drizzle ORM · ไม่มี test framework

## สถาปัตยกรรม
```
src/app/
  page.tsx                  redirect → /portal (login แล้ว) หรือ /login
  login/                    Mock Login (server action, cookie `iproctor_session` = proctor|admin)
  portal/                   FR-02 ตารางเวรคุมสอบ (period selector, ค้นหาห้อง, ปุ่ม Launch)
  room/[roomId]/            หน้าจอโปรเจกเตอร์ (client-only, RoomController)
  seating/[roomId]/         ผังที่นั่งรายห้อง (สาธารณะ, ปุ่ม "ดูผังที่นั่ง" ใน portal)
  api/v1/
    proctor/duties          GET (ต้อง login) ?period=&room=
    exam-rooms/[roomId]/schedule   ตารางสอบรายห้อง/รอบ (v1)
    exam-rooms/[roomId]/seating    ผังที่นั่ง (FR-03)
    proctor/my-assignment, time    (v1)
src/lib/server/
  auth.ts                   ★ จุดเดียวที่ต้องแก้เมื่อเชื่อม MFU SSO จริง
  data-source.ts            query ฐานข้อมูลให้หน้าเว็บ/API (เวร, ตารางรอบสอบ, ผังห้อง, ช่วงสอบ)
  db/schema.ts              ตาราง: staff, exam_periods, rooms, room_layouts (jsonb, มีเวอร์ชัน), courses,
                            exam_slots, slot_courses (กลุ่มที่นั่ง A/B + สี + เวลา), proctor_assignments, import_runs
  import/batch.ts           ImportBatch = รูปแบบกลางของข้อมูล 1 ช่วงสอบ → importBatch() แทนที่ทั้งช่วงใน transaction
  import/layouts.ts         โหลดผังห้อง JSON → room_layouts (ผังเปลี่ยน = เวอร์ชันใหม่)
  import/blendata.ts        ★ จุดเชื่อม Blendata API (ยังเป็น stub — รอเอกสาร API)
src/lib/  types.ts, config.ts, schedule-engine.ts (pure), audio-engine.ts, custom-audio-store.ts (IndexedDB), cache.ts, time.ts
src/hooks/ useOfficialTimer, useExamEngine, useRoomSchedule, useRoomLayout, useAudioEngine
src/components/ RoomController (ตัวประกอบหลัก), SeatingChart, SeatingOverlay, ControlBar, ...
```
- ข้อมูลตัวอย่าง (`npm run db:seed`) สร้างเวรอิง "วันนี้" (เวลา Asia/Bangkok) จึงเห็นเวร LIVE/UPCOMING/COMPLETED ได้ทุกวัน; LIVE = ก่อนเริ่ม 30 นาที ถึงจบรอบ
- Pre-Exam Mode: เมื่อ phase = `PRE_EXAM` (T-15) แสดงผังที่นั่งเต็มจออัตโนมัติ; ปุ่ม "ผังที่นั่ง" เปิดเองได้, ปิดแล้ว override อัตโนมัติ
- เสียงคำชี้แจงกำหนดเอง: เก็บใน IndexedDB ต่อห้อง บนเครื่องฉายเท่านั้น, ใช้แทน cue `rules` (เล่นตอน EXAM_START); chime อื่นยังเป็นไฟล์ใน `public/audio/` หรือ synth fallback
- โหมดจำลองเวลา: `/room/C3-107?session=afternoon&sim=13:14:50&speed=10`

## สถานะ Requirements
| FR | หัวข้อ | สถานะ |
|----|--------|-------|
| FR-01.1 | MFU SSO (OIDC) | ❌ TODO (ปุ่มปิดไว้ใน /login) |
| FR-01.2 | Mock Login proctor/admin | ✅ |
| FR-02.1–02.4 | Portal, period selector, Launch, ค้นหาห้อง | ✅ อ่านจาก PostgreSQL (เวรตัวอย่างจาก seed จนกว่าจะต่อ Blendata); อาจารย์เห็นเฉพาะเวรตัวเอง, Admin เห็นทั้งหมด |
| FR-03.1–03.2 | ผังที่นั่งตามผังจริง (แถว × กลุ่มโต๊ะ, ประตู/ไวท์บอร์ด) + ช่วงรหัส นศ. | ✅ ผังตามแบบผังจริง (โต๊ะ/เก้าอี้/ประตู พิกัดจาก PDF) ที่ `data/seating/<ROOM_ID>.json` แปลงจาก PDF สำนักทะเบียนด้วย `scripts/seating/import_pdf.py` (ดู README ในโฟลเดอร์) — ครบ 131 ห้อง 10 อาคาร (D1-301/306 ควรตรวจไวท์บอร์ด) |
| FR-04.1–04.3 | เสียงกำหนดเอง, auto trigger, chime fallback | ✅ แบบเก็บในเครื่อง (ยังไม่มี upload ไป server / `customAudioUrl`) |
| FR-05.1–05.4 | จอมินิมอล, timer รายวิชา, 45 นาที, **Live Proctor Notes** | ✅ Notes: ปุ่ม "ประกาศ / โน้ต" บนแถบควบคุม → กล่องประกาศบนจอ (+ ในผังเต็มจอ) เก็บ localStorage ต่อห้อง/วัน/รอบ (`useProctorNotes`, `ProctorNotes.tsx`) |
| Rec.1 | Pre/During-exam mode | ✅ |
| Rec.2 | Preload เสียง | ✅ (เมื่อ unlock; เสียงกำหนดเองอยู่ในเครื่อง) |
| Rec.3 | QR ผังที่นั่ง | ⛔ ผู้ใช้สั่งตัดออก (ไม่ใช้) |

## งานถัดไป (เรียงตามความสำคัญ)
1. เชื่อม Blendata API — ดูข้อ 3 (Blendata บอกกลุ่มที่นั่ง A/B ของแต่ละวิชาได้แล้ว; รอ URL/token/เอกสาร API หรือตัวอย่าง JSON)
2. เชื่อม MFU SSO จริง (แก้ `lib/server/auth.ts`, ใช้ cookie ที่ลงนาม/เข้ารหัส — ตอนนี้ cookie mock ปลอมแปลงได้)
3. รายละเอียด Blendata: แก้ `lib/server/import/blendata.ts` ให้คืน `ImportBatch` (+ วิธียืนยันตัวตนตามที่ทีม Blendata กำหนด); ตั้งเวลาดึงอัตโนมัติรายเทอม
3.1 ลบข้อมูลเก่าเกิน 1 ปีตามนโยบาย (เฉพาะข้อมูลส่วนบุคคล — เวรคุมสอบเก็บต่อได้) และเก็บ PDF ผังต้นฉบับใน MinIO (`room_layouts.source_url`)
4. อัปโหลดเสียงขึ้น server + `customAudioUrl` ใน `ProctorDuty`
5. เพิ่ม test (schedule-engine เป็น pure function ทดสอบง่าย)