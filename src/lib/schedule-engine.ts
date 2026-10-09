// Independent Multi-Course Engine — pure functions (ไม่มี side effect, ทดสอบได้ง่าย)

import { DEFAULT_ALERT_TIMING, TIMING } from "./config";
import { atTime } from "./time";
import type { AlertTiming, CourseState, CourseStatus, ExamEvent, RoomPhase, RoomSchedule } from "./types";

const MIN = 60_000;

/** เวลาแจ้งเตือนของรอบนี้ (จาก Admin) — schedule ที่ cache ไว้ก่อนมีฟีเจอร์นี้ใช้ค่าเริ่มต้น */
export const timingOf = (s: RoomSchedule): AlertTiming => s.timing ?? DEFAULT_ALERT_TIMING;

/** สร้างไทม์ไลน์เหตุการณ์ทั้งหมดของห้องสอบ เรียงตามเวลา */
export function buildTimeline(s: RoomSchedule): ExamEvent[] {
  const start = atTime(s.date, s.session_start);
  const events: ExamEvent[] = [
    { id: "room-open", type: "ROOM_OPEN", at: start - timingOf(s).roomOpenBeforeMin * MIN },
    { id: "exam-start", type: "EXAM_START", at: start },
    { id: "departure", type: "DEPARTURE_ALLOWED", at: atTime(s.date, s.departure_allowed_at) },
  ];

  for (const c of s.courses) {
    const end = atTime(s.date, c.end_time);
    for (const m of timingOf(s).warningsBeforeEndMin)
      events.push({ id: `warn-${c.course_id}-${m}`, type: "COURSE_WARNING", at: end - m * MIN, courseId: c.course_id, minutesLeft: m });
    events.push({ id: `end-${c.course_id}`, type: "COURSE_END", at: end, courseId: c.course_id });
  }

  const lastEnd = Math.max(...s.courses.map((c) => atTime(s.date, c.end_time)));
  events.push({ id: "session-end", type: "SESSION_END", at: lastEnd });

  return events.sort((a, b) => a.at - b.at);
}

export function getCourseStates(s: RoomSchedule, now: number): CourseState[] {
  const warnMin = Math.max(0, ...timingOf(s).warningsBeforeEndMin);
  return s.courses.map((course) => {
    const startAt = atTime(s.date, course.start_time);
    const endAt = atTime(s.date, course.end_time);
    let status: CourseStatus;
    if (now < startAt) status = "upcoming";
    else if (now >= endAt) status = "ended";
    else if (endAt - now <= warnMin * MIN) status = "warning";
    else status = "running";
    return { course, status, startAt, endAt, remainingMs: Math.min(endAt - now, endAt - startAt) };
  });
}

export function getRoomPhase(s: RoomSchedule, courses: CourseState[], now: number): RoomPhase {
  const start = atTime(s.date, s.session_start);
  if (now < start - timingOf(s).roomOpenBeforeMin * MIN) return "IDLE";
  if (now < start) return "PRE_EXAM";
  const ended = courses.filter((c) => c.status === "ended").length;
  if (ended === courses.length) return "SESSION_ENDED";
  if (now < start + TIMING.instructionMin * MIN) return "INSTRUCTION";
  if (ended > 0) return "COURSE_PARTIAL_ENDED";
  return "IN_PROGRESS";
}

export const PHASE_LABEL: Record<RoomPhase, { th: string; en: string }> = {
  IDLE: { th: "ยังไม่ถึงเวลาเปิดห้องสอบ", en: "Standby" },
  PRE_EXAM: { th: "เปิดห้องสอบ — กรุณานั่งตามแถวที่กำหนด", en: "Room Open · Please take your seat" },
  INSTRUCTION: { th: "เริ่มสอบ — ระเบียบการสอบ", en: "Exam Started · Instructions" },
  IN_PROGRESS: { th: "อยู่ระหว่างการสอบ", en: "Exam in Progress" },
  COURSE_PARTIAL_ENDED: { th: "บางรายวิชาหมดเวลาแล้ว", en: "Some Courses Ended" },
  SESSION_ENDED: { th: "สิ้นสุดการสอบทุกรายวิชา", en: "Session Ended" },
};
