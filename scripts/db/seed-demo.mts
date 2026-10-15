// npm run db:seed — ข้อมูลตัวอย่างสำหรับพัฒนา/ทดสอบ (แทน mock เดิม)
// สร้างเวรอิง "วันนี้" (เวลา Asia/Bangkok) จึงเห็นเวร กำลังสอบ / ถัดไป / เสร็จสิ้น ได้ทุกวัน — รันซ้ำได้
// แต่ละรอบใช้ห้อง/ผังต่างกัน (2 วิชา A/B, วิชาเดียว, ไวท์บอร์ดคนละฝั่ง) เพื่อทดสอบหน้าจอกับผังหลายแบบ
// ใช้ pipeline เดียวกับการนำเข้าจาก Blendata (importBatch)

import { db, sql } from "../../src/lib/server/db";
import { importBatch, type ImportBatch } from "../../src/lib/server/import/batch";

type Slot = ImportBatch["slots"][number];
type Session = Slot["session"];

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
const shift = (days: number) => {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

// 58123456 / 00000001 ตรงกับผู้ใช้ Mock Login ใน src/lib/server/auth.ts
const staff: ImportBatch["staff"] = [
  { staffId: "58123456", name: "Aj. Prasit Meesook", type: "LECTURER" },
  { staffId: "00000001", name: "Exam Office Admin", type: "STAFF" },
  { staffId: "60111222", name: "Somchai Jaidee", type: "STAFF" },
  { staffId: "59100001", name: "Aj. Kanya Srisuk", type: "LECTURER" },
  { staffId: "59100002", name: "Aj. Wichai Thongdee", type: "LECTURER" },
  { staffId: "59100003", name: "Aj. Nittaya Boonmee", type: "LECTURER" },
  { staffId: "61200001", name: "Malee Suksawat", type: "STAFF" },
  { staffId: "61200002", name: "Anan Rattana", type: "STAFF" },
];

const COURSES: Record<string, string> = {
  "1302301": "Cruise Operations and Services",
  "1501402": "Professional Physical Therapy",
  "1003101": "English for Communication",
  "1104107": "Fundamental Physics",
  "1201205": "Principles of Marketing",
  "1403110": "Calculus for Engineers",
  "1601102": "General Chemistry",
  "1702303": "Business Law",
  "1802201": "Introduction to Programming",
  "1903104": "Thai Language for Communication",
};
const courses = Object.entries(COURSES).map(([courseCode, courseName]) => ({ courseCode, courseName }));

const TIMES: Record<Session, { start: string; end3: string; end2: string }> = {
  morning: { start: "09:00", end3: "12:00", end2: "11:00" },
  afternoon: { start: "13:30", end3: "16:30", end2: "15:30" },
};
const range = (code: string) => `67${code.slice(0, 4)}001 - 67${code.slice(0, 4)}080`;

/** ห้องสอบ 2 วิชา: กลุ่ม A 3 ชม. (ชมพู) + กลุ่ม B 2 ชม. (ขาว) — สีมาจากผังห้อง */
const twoCourses = (session: Session, a: string, b: string): Slot["courses"] => [
  { courseCode: a, seatGroup: "A", startTime: TIMES[session].start, endTime: TIMES[session].end3, studentIdRange: range(a), instructions: "ไม่อนุญาตให้นำอุปกรณ์สื่อสารเข้าห้องสอบ" },
  { courseCode: b, seatGroup: "B", startTime: TIMES[session].start, endTime: TIMES[session].end2, studentIdRange: range(b), instructions: "ไม่อนุญาตเครื่องคิดเลข" },
];
/** ห้องสอบวิชาเดียว (เลขที่นั่งไม่มีตัวอักษรนำ) */
const oneCourse = (session: Session, code: string, hours: 2 | 3 = 2): Slot["courses"] => [
  { courseCode: code, seatGroup: "", startTime: TIMES[session].start, endTime: hours === 3 ? TIMES[session].end3 : TIMES[session].end2, studentIdRange: range(code) },
];
/** วิชาเดียวหลายกลุ่มเรียนในห้องเดียว (เลขที่นั่งล้วน) — แต่ละ sec มีช่วงที่นั่งของตัวเอง */
const sections = (session: Session, code: string, ranges: Array<[number, number]>): Slot["courses"] =>
  ranges.map(([from, to], i) => ({
    courseCode: code, section: String(i + 1), seatGroup: "", startTime: TIMES[session].start, endTime: TIMES[session].end3,
    seatFrom: String(from), seatTo: String(to),
  }));
const proctors = (head: string, assistant?: string): Slot["proctors"] =>
  assistant ? [{ staffId: head, role: "HEAD" }, { staffId: assistant, role: "ASSISTANT" }] : [{ staffId: head, role: "HEAD" }];

const ME = "58123456";
const slot = (roomId: string, date: string, session: Session, c: Slot["courses"], p: Slot["proctors"]): Slot => ({
  roomId, date, session, courses: c, proctors: p,
});

const midterm: ImportBatch = {
  period: { academicYear: 2026, term: 1, kind: "MIDTERM", startsOn: shift(-1), endsOn: shift(2) },
  staff,
  courses,
  slots: [
    // เวรของอาจารย์ Mock Login — แต่ละรอบคนละห้อง/ผัง
    slot("C5-302", shift(-1), "morning", twoCourses("morning", "1104107", "1201205"), proctors(ME, "61200001")), // 240 ที่ ไวท์บอร์ดซ้าย
    slot("C2-402", today, "morning", twoCourses("morning", "1403110", "1601102"), proctors(ME, "60111222")), // 84 ที่ A/B
    slot("C3-107", today, "afternoon", twoCourses("afternoon", "1302301", "1501402"), proctors(ME, "60111222")), // 160 ที่ ไวท์บอร์ดบน
    slot("C5-318", shift(1), "morning", oneCourse("morning", "1003101"), proctors(ME)), // 48 ที่ ไวท์บอร์ดขวา
    // วิชาเดียว 4 กลุ่มเรียน (sec) แบ่งช่วงที่นั่ง → การ์ดเดียวแสดง Sec 1–4 พร้อมช่วงที่นั่ง
    slot("E3B-101", today, "afternoon", sections("afternoon", "1802201", [[1, 26], [27, 52], [53, 78], [79, 104]]), proctors(ME, "61200002")), // 104 ที่ 4 ประตู
    // ห้องอื่นรอบบ่ายวันนี้ (ให้ dashboard ของ Admin มีข้อมูล)
    slot("C2-403", today, "afternoon", twoCourses("afternoon", "1702303", "1903104"), proctors("59100001", "61200001")),
    slot("E4A-514", today, "afternoon", oneCourse("afternoon", "1104107", 3), proctors("59100002")),
    slot("C1-313", today, "afternoon", oneCourse("afternoon", "1201205"), proctors("59100003", "61200002")),
    slot("S7A-401", today, "afternoon", oneCourse("afternoon", "1003101"), proctors("61200001")),
    slot("D1-301", today, "afternoon", oneCourse("afternoon", "1601102", 3), proctors("59100001")),
  ],
};
const final: ImportBatch = {
  period: { academicYear: 2026, term: 1, kind: "FINAL", startsOn: shift(45), endsOn: shift(52) },
  staff,
  courses,
  slots: [
    slot("C2-406", shift(45), "morning", twoCourses("morning", "1302301", "1501402"), proctors(ME, "60111222")),
    slot("C5-301", shift(46), "afternoon", twoCourses("afternoon", "1104107", "1403110"), proctors(ME)),
  ],
};

for (const batch of [midterm, final]) {
  const r = await importBatch(db, batch, "seed-demo");
  console.log(`seed ${r.periodId}:`, r.stats, r.warnings.length ? r.warnings : "");
}
await sql.end();
