# Changelog

รูปแบบ: ใหม่สุดอยู่บนสุด · ทุกครั้งที่แก้ระบบให้เพิ่มรายการที่นี่ (ระบุไฟล์สำคัญที่เกี่ยวข้อง)

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
### Changed
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
- FR-01.1 SSO จริง, FR-05.4 Live Proctor Notes, อัปโหลดเสียงขึ้น server — ดู HANDOFF.md

## 2026-xx — Scaffold (commit d31b9b7)
- v1: หน้าจอโปรเจกเตอร์ `/room/[roomId]`, state machine, Web Worker timer, audio engine, โหมดจำลองเวลา
