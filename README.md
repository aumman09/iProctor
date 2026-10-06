# iProctor MFU

ระบบผู้ช่วยคุมสอบ (Intelligent Exam Room Controller) มหาวิทยาลัยแม่ฟ้าหลวง — ดูรายละเอียดความต้องการใน PRD

## เริ่มใช้งาน

```bash
npm install
npm run dev
```

- `http://localhost:3000/` → พาไปห้องสอบที่ได้รับมอบหมาย (ตอนนี้เป็น mock: `C3-107`)
- `http://localhost:3000/room/C3-107` → หน้าจอฉายโปรเจกเตอร์
- โหมดจำลองเวลา (ซ้อม/ทดสอบ): `/room/C3-107?session=afternoon&sim=13:14:50&speed=1`
  จะมีแถบปุ่มกระโดดไปแต่ละเหตุการณ์ และปรับความเร็ว x1 / x10 / x60

## โครงสร้าง

```
src/
├─ app/
│  ├─ page.tsx                          # redirect ไปห้องสอบถัดไปของกรรมการ
│  ├─ login/page.tsx                    # (TODO) MFU SSO
│  ├─ room/[roomId]/page.tsx            # หน้าจอฉายห้องสอบ
│  └─ api/v1/
│     ├─ time/route.ts                  # เวลาอ้างอิงเซิร์ฟเวอร์ (NTP sync)
│     ├─ exam-rooms/[roomId]/schedule/  # ตารางสอบของห้อง
│     └─ proctor/my-assignment/         # งานคุมสอบถัดไป
├─ lib/
│  ├─ types.ts                          # data contracts (PRD §5)
│  ├─ config.ts                         # เวลารอบสอบ, กฎแจ้งเตือน, รายการไฟล์เสียง
│  ├─ schedule-engine.ts                # สร้างไทม์ไลน์ event + สถานะรายวิชา/ห้อง (pure)
│  ├─ audio-engine.ts                   # Web Audio: unlock, คิวเสียง, chime สำรอง
│  ├─ time.ts, cache.ts
│  └─ server/data-source.ts             # ★ จุดเชื่อม MFU API (ตอนนี้เป็น mock)
├─ workers/timer.worker.ts              # ticker แบบไม่ drift
├─ hooks/                               # useOfficialTimer, useRoomSchedule, useExamEngine, useAudioEngine
└─ components/                          # Header, OfficialClock, CourseCard, AlertCenter, InstructionSlides, ...
public/audio/                           # ★ วางไฟล์เสียงประกาศที่นี่ (ดู README ในโฟลเดอร์)
```

## ยังค้างอยู่ (TODO)

- ไฟล์เสียงประกาศจริง (`public/audio/`)
- เชื่อม MFU SSO (OAuth2 / OIDC) และ MFU Examination API (`src/lib/server/data-source.ts`)
- ข้อความระเบียบการสอบฉบับทางการ (`src/components/InstructionSlides.tsx`)
