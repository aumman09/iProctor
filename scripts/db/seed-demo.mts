// npm run db:seed — ข้อมูลตัวอย่างสำหรับพัฒนา/ทดสอบ (แทน mock เดิม)
// สร้างเวรอิง "วันนี้" (เวลา Asia/Bangkok) จึงเห็นเวร กำลังสอบ / ถัดไป / เสร็จสิ้น ได้ทุกวัน — รันซ้ำได้
// ใช้ pipeline เดียวกับการนำเข้าจาก Blendata (importBatch)

import { db, sql } from "../../src/lib/server/db";
import { importBatch, type ImportBatch } from "../../src/lib/server/import/batch";

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
const shift = (days: number) => {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

// ตรงกับผู้ใช้ Mock Login ใน src/lib/server/auth.ts
const staff: ImportBatch["staff"] = [
  { staffId: "58123456", name: "Aj. Prasit Meesook", type: "LECTURER" },
  { staffId: "00000001", name: "Exam Office Admin", type: "STAFF" },
  { staffId: "60111222", name: "Somchai Jaidee", type: "STAFF" },
];
const courses: ImportBatch["courses"] = [
  { courseCode: "1302301", courseName: "Cruise Operations and Services" },
  { courseCode: "1501402", courseName: "Professional Physical Therapy" },
  { courseCode: "1003101", courseName: "English for Communication" },
];

const twoCourses = (session: "morning" | "afternoon") => {
  const [s, e3, e2] = session === "morning" ? ["09:00", "12:00", "11:00"] : ["13:30", "16:30", "15:30"];
  return [
    {
      courseCode: "1302301", seatGroup: "A", startTime: s, endTime: e3,
      studentIdRange: "6731205017 - 6931205901", instructions: "ไม่อนุญาตให้นำอุปกรณ์สื่อสารเข้าห้องสอบ",
    },
    {
      courseCode: "1501402", seatGroup: "B", startTime: s, endTime: e2,
      studentIdRange: "6532502003 - 6632502075", instructions: "ไม่อนุญาตเครื่องคิดเลข",
    },
  ];
};
const proctors: ImportBatch["slots"][number]["proctors"] = [
  { staffId: "58123456", role: "HEAD" },
  { staffId: "60111222", role: "ASSISTANT" },
];

const midterm: ImportBatch = {
  period: { academicYear: 2026, term: 1, kind: "MIDTERM", startsOn: shift(-1), endsOn: shift(1) },
  staff,
  courses,
  slots: [
    { roomId: "C3-107", date: shift(-1), session: "morning", courses: twoCourses("morning"), proctors },
    { roomId: "C3-107", date: today, session: "morning", courses: twoCourses("morning"), proctors },
    { roomId: "C3-107", date: today, session: "afternoon", courses: twoCourses("afternoon"), proctors },
    { roomId: "C3-107", date: shift(1), session: "afternoon", courses: twoCourses("afternoon"), proctors },
    {
      roomId: "C5-318", date: shift(1), session: "morning", proctors: [{ staffId: "60111222", role: "HEAD" }],
      courses: [{ courseCode: "1003101", seatGroup: "", startTime: "09:00", endTime: "11:00" }],
    },
  ],
};
const final: ImportBatch = {
  period: { academicYear: 2026, term: 1, kind: "FINAL", startsOn: shift(45), endsOn: shift(52) },
  staff,
  courses,
  slots: [{ roomId: "C3-107", date: shift(45), session: "morning", courses: twoCourses("morning"), proctors }],
};

for (const batch of [midterm, final]) {
  const r = await importBatch(db, batch, "seed-demo");
  console.log(`seed ${r.periodId}:`, r.stats, r.warnings.length ? r.warnings : "");
}
await sql.end();
