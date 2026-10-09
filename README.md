# iProctor MFU

ระบบผู้ช่วยคุมสอบ (Intelligent Exam Room Controller) มหาวิทยาลัยแม่ฟ้าหลวง
กรรมการคุมสอบดูเวรของตัวเอง แล้วเปิด "หน้าจอคุมสอบ" ขึ้นโปรเจกเตอร์ — นาฬิกาทางการ, เวลานับถอยหลังแยกรายวิชา,
ประกาศเสียงอัตโนมัติ และผังที่นั่งก่อนเริ่มสอบ

> สเปก: [Docs/iproctor_mfu_technical_requirements.md](Docs/iproctor_mfu_technical_requirements.md) ·
> สถานะงาน/สถาปัตยกรรม: [Docs/HANDOFF.md](Docs/HANDOFF.md) · ประวัติการแก้: [Docs/CHANGELOG.md](Docs/CHANGELOG.md)

## เริ่มใช้งาน

ต้องมี Node.js 20 ขึ้นไป และ Docker (สำหรับ PostgreSQL)

```bash
npm install
cp .env.example .env     # DATABASE_URL ชี้ไป Postgres ใน docker (พอร์ต 5433)
npm run db:up            # docker compose up -d
npm run db:setup         # migrate + โหลดผังห้อง 131 ห้อง + ข้อมูลตัวอย่าง
npm run dev
```

เปิด http://localhost:3000 → ระบบพาไปหน้า login แล้วกดปุ่ม **Mock Login** (เข้าเป็นอาจารย์ผู้คุมสอบ หรือ Admin กลาง)
ยังไม่ได้เชื่อม MFU SSO และ Blendata — เวรคุมสอบเป็นข้อมูลตัวอย่างจาก `npm run db:seed`

ก่อนส่งงาน: `npm run lint` และ `npm run build`

## การใช้งาน

```
/login  ──►  /portal (ตารางคุมสอบ)  ──►  /room/[roomId] (หน้าจอโปรเจกเตอร์)
                    └──────────────────►  /seating/[roomId] (ผังที่นั่ง)
```

| หน้า | ใช้ทำอะไร | ต้อง login |
| :--- | :--- | :---: |
| `/portal` | เวรคุมสอบของฉัน เลือกช่วงสอบ (Midterm/Final) ค้นหาห้องกรณีคุมแทน และปุ่ม **เปิดหน้าจอคุมสอบ** (กดได้ตั้งแต่ 30 นาทีก่อนเริ่มจนจบรอบ) | ✓ |
| `/room/[roomId]?session=morning\|afternoon` | หน้าจอฉายในห้องสอบ — ต้องกด **เริ่มระบบ** หนึ่งครั้งเพื่อให้เบราว์เซอร์เล่นเสียงได้; ปุ่ม **ประกาศ / โน้ต** พิมพ์ข้อความขึ้นจอให้นักศึกษาอ่าน (เก็บในเครื่องฉาย) | – |
| `/seating/[roomId]` | ผังที่นั่งรายห้องสำหรับนักศึกษา | – |

อาจารย์/พนักงานเห็นเฉพาะเวรของตัวเอง, Admin เห็นทุกเวร, ค้นหาห้องได้ทุกห้อง (กรณีคุมสอบแทน)
ข้อมูลตัวอย่างสร้างอิงวันที่ปัจจุบัน (เวลา Asia/Bangkok) — รัน `npm run db:seed` ใหม่ทุกวันที่ทดสอบ เพื่อให้เห็นเวรสถานะ กำลังสอบ / ถัดไป / เสร็จสิ้น

### ไทม์ไลน์ของหน้าจอคุมสอบ

| เวลา | เกิดอะไรขึ้น |
| :--- | :--- |
| T-15 นาที | เปิดห้อง ประกาศต้อนรับ แสดงผังที่นั่งเต็มจอ (Pre-Exam Mode) |
| T-0 | เริ่มสอบ เล่นเสียงคำชี้แจง และแสดงสไลด์ระเบียบการสอบ 5 นาที |
| T+45 นาที | เสียงเตือน + แจ้งว่าออกจากห้องสอบได้ |
| เหลือ 10 นาที | เตือนแยกตามรายวิชา (วิชา 2 ชม. กับ 3 ชม. จบไม่พร้อมกัน) |
| หมดเวลา | เสียงหมดเวลา แยกตามรายวิชา |

รอบสอบมาตรฐาน: เช้า 09:00–12:00, บ่าย 13:30–16:30 — ปรับได้ที่ `src/lib/config.ts`

### ซ้อม / ทดสอบด้วยโหมดจำลองเวลา

```
/room/C3-107?session=afternoon&sim=13:14:50&speed=10
```

`sim` = เวลาเริ่มจำลอง, `speed` = ความเร็ว — จะมีแถบปุ่มกระโดดไปแต่ละเหตุการณ์ และปรับความเร็ว x1 / x10 / x60

## ฐานข้อมูลและการนำเข้าข้อมูล

PostgreSQL + Drizzle ORM — schema อยู่ที่ `src/lib/server/db/schema.ts`, migration ใน `drizzle/`

| คำสั่ง | ทำอะไร |
| :--- | :--- |
| `npm run db:up` | เปิด Postgres (docker compose) |
| `npm run db:migrate` | รัน migration |
| `npm run db:generate` | สร้าง migration ใหม่หลังแก้ schema |
| `npm run db:layouts` | โหลดผังห้องจาก `data/seating/*.json` (ผังเปลี่ยน = เวอร์ชันใหม่) |
| `npm run db:seed` | ข้อมูลตัวอย่าง (เวรอิงวันนี้) |
| `npm run import:exam -- --file batch.json` | นำเข้าห้องสอบ/วิชา/ผู้คุมสอบของ 1 ช่วงสอบจากไฟล์ |
| `npm run import:exam -- --blendata --year 2026 --term 1 --kind MIDTERM` | ดึงจาก Blendata (ยังไม่ได้เชื่อม — รอเอกสาร API) |

การนำเข้า 1 ช่วงสอบเป็นแบบ **แทนที่ทั้งช่วง** (ดึงซ้ำได้ ไม่ซ้อน) ใน transaction เดียว และบันทึกผลใน `import_runs`
ข้อมูลที่ข้ามจะแจ้งเตือน เช่น ห้องที่ยังไม่มีผัง, ผู้คุมสอบที่ไม่รู้จัก, กลุ่มที่นั่งที่ไม่มีในผัง
รูปแบบไฟล์ = `ImportBatch` ใน `src/lib/server/import/batch.ts` (สีป้ายไม่ระบุได้ — ใช้สีของกลุ่มในผังห้อง)

## ข้อมูลที่ต้องเตรียม

- **ผังที่นั่ง** — หนึ่งห้องหนึ่งไฟล์ `data/seating/<ROOM_ID>.json` แปลงอัตโนมัติจาก PDF ของสำนักทะเบียน
  ด้วย `python scripts/seating/import_pdf.py <pdf>` (ต้องมี Python + `pip install pymupdf`) แล้ว `npm run db:layouts`
  ดู [data/seating/README.md](data/seating/README.md)
- **ไฟล์เสียงประกาศ** — วางใน `public/audio/` ตามชื่อใน [public/audio/README.md](public/audio/README.md)
  ถ้าไม่มีไฟล์ ระบบเล่นเสียง chime สังเคราะห์แทน
- **เสียงคำชี้แจงเริ่มสอบแบบกำหนดเอง** — เลือกไฟล์ .mp3/.wav จากแถบควบคุมบนหน้าจอคุมสอบ
  ไฟล์เก็บในเบราว์เซอร์ของเครื่องฉายนั้น (IndexedDB) ยังไม่อัปโหลดขึ้นเซิร์ฟเวอร์

## โครงสร้างโปรเจกต์

```
src/
├─ app/
│  ├─ page.tsx                     # redirect → /portal หรือ /login
│  ├─ login/                       # Mock Login (server action + cookie)
│  ├─ portal/                      # ตารางเวรคุมสอบ
│  ├─ room/[roomId]/               # หน้าจอโปรเจกเตอร์ (client-only)
│  ├─ seating/[roomId]/            # ผังที่นั่ง
│  └─ api/v1/
│     ├─ proctor/duties            # เวรคุมสอบ (ต้อง login) ?period=&room=
│     ├─ proctor/my-assignment     # งานคุมสอบถัดไป
│     ├─ exam-rooms/[roomId]/schedule   # ตารางสอบรายห้อง/รอบ
│     ├─ exam-rooms/[roomId]/seating    # ผังที่นั่ง
│     └─ time                      # เวลาอ้างอิงจากเซิร์ฟเวอร์
├─ lib/
│  ├─ types.ts                     # data contracts
│  ├─ config.ts                    # เวลารอบสอบ, กฎแจ้งเตือน, รายการไฟล์เสียง
│  ├─ schedule-engine.ts           # คำนวณไทม์ไลน์และสถานะรายวิชา (pure function)
│  ├─ audio-engine.ts              # Web Audio: unlock, คิวเสียง, chime สำรอง
│  ├─ custom-audio-store.ts        # เก็บเสียงกำหนดเองใน IndexedDB
│  └─ server/
│     ├─ auth.ts                   # ★ จุดเชื่อม MFU SSO
│     ├─ data-source.ts            # query ฐานข้อมูลให้หน้าเว็บ/API
│     ├─ db/                       # Drizzle: schema.ts, client
│     └─ import/                   # batch.ts (นำเข้าช่วงสอบ), layouts.ts (ผังห้อง), blendata.ts (★ จุดเชื่อม Blendata)
├─ workers/timer.worker.ts         # ticker ที่ไม่ drift
├─ hooks/                          # useOfficialTimer, useExamEngine, useRoomSchedule, useRoomLayout, useAudioEngine
└─ components/                     # RoomController (ตัวประกอบหลัก), SeatingChart, ControlBar, ...
data/seating/                      # ผังที่นั่งรายห้อง (JSON จาก PDF สำนักทะเบียน)
drizzle/                           # SQL migration
scripts/                           # seating/import_pdf.py, db/*.mts (migrate, layouts, seed), import/exam-data.mts
public/audio/                      # ไฟล์เสียงประกาศ
```

Stack: Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · lucide-react · PostgreSQL + Drizzle ORM — ยังไม่มี test framework

## ยังค้างอยู่

- เชื่อม MFU SSO จริง (`src/lib/server/auth.ts`) — **cookie mock ตอนนี้ปลอมแปลงได้ ห้ามใช้งานจริง**
- เชื่อม Blendata API (`src/lib/server/import/blendata.ts`) — รอเอกสาร API
- อัปโหลดเสียงคำชี้แจงขึ้นเซิร์ฟเวอร์
- ไฟล์เสียงประกาศจริง และข้อความระเบียบการสอบฉบับทางการ (`src/components/InstructionSlides.tsx`)
- Test สำหรับ `schedule-engine`

รายละเอียดและลำดับความสำคัญดู [Docs/HANDOFF.md](Docs/HANDOFF.md)
