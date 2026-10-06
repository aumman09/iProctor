import "server-only";

// แหล่งข้อมูลฝั่งเซิร์ฟเวอร์
// ตอนนี้ใช้ข้อมูลจำลอง (mock) — เมื่อเชื่อม MFU Examination & Scheduling API ให้แก้ที่ไฟล์นี้ที่เดียว

import { readFile } from "node:fs/promises";
import path from "node:path";
import { SESSIONS, TIMING } from "../config";
import { addMinutes } from "../time";
import type { AuthUser, Course, ExamPeriod, MyAssignment, ProctorDuty, RoomLayoutResponse, RoomSchedule, SessionName } from "../types";

type MockCourse = Omit<Course, "start_time" | "end_time"> & { start_offset_min: number };

const MOCK_ROOMS: Record<string, { building: string; room_number: string; courses: MockCourse[] }> = {
  "C3-107": {
    building: "C3",
    room_number: "107",
    courses: [
      {
        course_id: "c-101",
        course_code: "1302301",
        course_name: "Cruise Operations and Services",
        section: "1",
        row_label: "A",
        seat_color_theme: "pink",
        seat_description: "Row 1 (A1 - A10)",
        student_id_range: "6731205017 - 6931205901",
        start_offset_min: 0,
        duration_minutes: 180,
        instructions: "ไม่อนุญาตให้นำอุปกรณ์สื่อสารเข้าห้องสอบ",
      },
      {
        course_id: "c-102",
        course_code: "1501402",
        course_name: "Professional Physical Therapy",
        section: "1",
        row_label: "B",
        seat_color_theme: "white",
        seat_description: "Row 2 (B1 - B10)",
        student_id_range: "6532502003 - 6632502075",
        start_offset_min: 0,
        duration_minutes: 120,
        instructions: "ไม่อนุญาตเครื่องคิดเลข",
      },
    ],
  },
};

const MOCK_PROCTOR = { staff_id: "58123456", name: "Aj. Prasit Meesook", role: "Head Proctor" };

export async function getRoomSchedule(
  roomId: string,
  date: string,
  session: SessionName,
): Promise<RoomSchedule | null> {
  // TODO: เรียก MFU Examination & Scheduling API จริง
  const room = MOCK_ROOMS[roomId.toUpperCase()];
  if (!room) return null;

  const { start, end } = SESSIONS[session];
  return {
    room_code: `${room.building} ${room.room_number}`,
    building: room.building,
    room_number: room.room_number,
    session,
    date,
    session_start: start,
    session_end: end,
    departure_allowed_at: addMinutes(start, TIMING.departureAfterMin),
    proctors: [MOCK_PROCTOR],
    courses: room.courses.map(({ start_offset_min, ...c }) => {
      const courseStart = addMinutes(start, start_offset_min);
      return { ...c, start_time: courseStart, end_time: addMinutes(courseStart, c.duration_minutes) };
    }),
  };
}

export async function getMyAssignment(_ssoToken: string | null, date: string, session: SessionName): Promise<MyAssignment> {
  // TODO: ตรวจ SSO token และดึงงานคุมสอบถัดไปของอาจารย์/เจ้าหน้าที่
  return {
    staff_id: MOCK_PROCTOR.staff_id,
    name: MOCK_PROCTOR.name,
    next_assignment: { room_id: "C3-107", date, session, status: "ready" },
  };
}

// ---------- v2: Duties & Seating (mock) ----------

const BKK = "Asia/Bangkok";

/** วันที่/นาทีของวันตามเวลา Asia/Bangkok (เซิร์ฟเวอร์อาจอยู่คนละ timezone) */
function bangkokNow(epoch: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BKK, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(epoch);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const toMin = (hms: string) => Number(hms.slice(0, 2)) * 60 + Number(hms.slice(3, 5));

/** TODO: แทนที่ด้วย MFU Examination & Scheduling API — ตอนนี้สร้างเวรจำลองอิงวันนี้ เพื่อให้ demo ได้ทุกวัน */
function mockDutySeeds(today: string): Array<{ period: ExamPeriod; date: string; session: SessionName; roomId: string }> {
  return [
    { period: "Midterm 1/2026", date: shiftDate(today, -1), session: "morning", roomId: "C3-107" },
    { period: "Midterm 1/2026", date: today, session: "morning", roomId: "C3-107" },
    { period: "Midterm 1/2026", date: today, session: "afternoon", roomId: "C3-107" },
    { period: "Midterm 1/2026", date: shiftDate(today, 1), session: "afternoon", roomId: "C3-107" },
    { period: "Final 1/2026", date: shiftDate(today, 45), session: "morning", roomId: "C3-107" },
  ];
}

export async function getProctorDuties(
  _user: AuthUser,
  opts: { period?: ExamPeriod; roomQuery?: string; now?: number } = {},
): Promise<ProctorDuty[]> {
  const now = bangkokNow(opts.now ?? Date.now());
  const q = opts.roomQuery?.trim().toLowerCase();

  const duties = mockDutySeeds(now.date).flatMap((s): ProctorDuty[] => {
    const room = MOCK_ROOMS[s.roomId];
    if (!room || (opts.period && s.period !== opts.period)) return [];
    if (q && !`${room.building}${room.room_number} ${s.roomId}`.toLowerCase().replace(/[\s-]/g, "").includes(q.replace(/[\s-]/g, ""))) return [];

    const { start, end } = SESSIONS[s.session];
    const startMin = toMin(start);
    const endMin = toMin(end);
    const isToday = s.date === now.date;
    const past = s.date < now.date || (isToday && now.minutes > endMin);
    const canLaunch = isToday && now.minutes >= startMin - 30 && now.minutes <= endMin;

    return [{
      dutyId: `${s.roomId}_${s.date}_${s.session}`,
      examPeriod: s.period,
      date: s.date,
      session: s.session,
      sessionTime: `${start.slice(0, 5)} - ${end.slice(0, 5)}`,
      building: room.building,
      roomNumber: room.room_number,
      roomId: s.roomId,
      isCurrentSession: canLaunch,
      status: past ? "COMPLETED" : canLaunch ? "LIVE" : "UPCOMING",
      canLaunch,
      coursesSummary: room.courses.map((c) => ({
        courseCode: c.course_code, courseName: c.course_name, rowLabel: c.row_label, seatColorTheme: c.seat_color_theme,
      })),
    }];
  });

  return duties.sort((a, b) => (a.date + a.sessionTime).localeCompare(b.date + b.sessionTime));
}

/** อ่านผังที่นั่งจาก data/seating/<ROOM_ID>.json (โฟลเดอร์เก็บผังรายห้อง) */
export async function getRoomLayout(roomId: string): Promise<RoomLayoutResponse | null> {
  if (!/^[A-Za-z0-9-]+$/.test(roomId)) return null;
  try {
    const file = path.join(process.cwd(), "data", "seating", `${roomId.toUpperCase()}.json`);
    return JSON.parse((await readFile(file, "utf8")).replace(/^\uFEFF/, "")) as RoomLayoutResponse;
  } catch {
    return null;
  }
}
