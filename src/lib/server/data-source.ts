import "server-only";

// แหล่งข้อมูลฝั่งเซิร์ฟเวอร์
// ตอนนี้ใช้ข้อมูลจำลอง (mock) — เมื่อเชื่อม MFU Examination & Scheduling API ให้แก้ที่ไฟล์นี้ที่เดียว

import { SESSIONS, TIMING } from "../config";
import { addMinutes } from "../time";
import type { Course, MyAssignment, RoomSchedule, SessionName } from "../types";

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
