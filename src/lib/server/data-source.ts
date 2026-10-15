import "server-only";

// แหล่งข้อมูลฝั่งเซิร์ฟเวอร์ — อ่านจาก PostgreSQL (ข้อมูลนำเข้าจาก Blendata + ผังห้องจาก PDF สำนักทะเบียน)
// ดู src/lib/server/db/schema.ts และ src/lib/server/import/

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { SESSIONS } from "../config";
import { addMinutes } from "../time";
import type { AuthUser, Course, MyAssignment, ProctorDuty, RoomLayoutResponse, RoomSchedule, SessionName } from "../types";
import { MOCK_USERS } from "./auth";
import { db } from "./db";
import { courses, examPeriods, examSlots, proctorAssignments, roomLayouts, rooms, slotCourses, staff } from "./db/schema";
import { getAlertTiming, getRulesCues } from "./settings";

const BKK = "Asia/Bangkok";

/** วันที่/นาทีของวันตามเวลา Asia/Bangkok (เซิร์ฟเวอร์อาจอยู่คนละ timezone) */
function bangkokNow(epoch: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BKK, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(epoch);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

const toMin = (hms: string) => Number(hms.slice(0, 2)) * 60 + Number(hms.slice(3, 5));
const minutesBetween = (a: string, b: string) => toMin(b) - toMin(a);

type SlotCourseRow = Awaited<ReturnType<typeof coursesOfSlots>>[number];

/** รวมกลุ่มเรียนของวิชาเดียวกัน (รหัสวิชา + เวลาเริ่ม/จบ + กลุ่มที่นั่ง) เรียงตามเลข sec */
function groupSections(rows: SlotCourseRow[]): SlotCourseRow[][] {
  const groups = new Map<string, SlotCourseRow[]>();
  for (const r of rows) {
    const key = `${r.courseCode}|${r.startTime}|${r.endTime}|${r.seatGroup}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return [...groups.values()].map((g) => g.sort((a, b) => a.section.localeCompare(b.section, "en", { numeric: true })));
}

/** demo: กลุ่มที่นั่งเกิน 30 ที่ แบ่งเป็น 3 sec เท่า ๆ กัน (ตัวอย่างการแสดงหลายกลุ่มเรียน) */
function demoSections(layout: RoomLayoutResponse, group: string): Course["sections"] {
  const nums = layout.seats.filter((s) => s.group === group).map((s) => Number(s.id.slice(group.length))).sort((a, b) => a - b);
  if (nums.length <= 30) return [{ section: "1" }];
  const size = Math.ceil(nums.length / 3);
  return [0, 1, 2].map((i) => ({
    section: String(i + 1),
    seat_from: `${group}${nums[i * size]}`,
    seat_to: `${group}${nums[Math.min(nums.length, (i + 1) * size) - 1]}`,
  }));
}

/** วิชาในรอบสอบ (เรียงตามกลุ่มที่นั่ง A, B, ...) */
async function coursesOfSlots(slotIds: number[]) {
  if (!slotIds.length) return [];
  return db
    .select({
      id: slotCourses.id,
      slotId: slotCourses.slotId,
      courseCode: slotCourses.courseCode,
      courseName: courses.courseName,
      section: slotCourses.section,
      seatGroup: slotCourses.seatGroup,
      seatColor: slotCourses.seatColor,
      startTime: slotCourses.startTime,
      endTime: slotCourses.endTime,
      studentIdRange: slotCourses.studentIdRange,
      seatFrom: slotCourses.seatFrom,
      seatTo: slotCourses.seatTo,
      instructions: slotCourses.instructions,
      adminNote: slotCourses.adminNote,
      completedAt: slotCourses.completedAt,
    })
    .from(slotCourses)
    .innerJoin(courses, eq(courses.courseCode, slotCourses.courseCode))
    .where(inArray(slotCourses.slotId, slotIds))
    .orderBy(asc(slotCourses.seatGroup), asc(slotCourses.courseCode));
}

/** ช่วงสอบทั้งหมด ใหม่สุดก่อน — ค่าแรกที่ยังไม่จบ = ค่าเริ่มต้นของ portal */
export async function getExamPeriods(now = Date.now()): Promise<{ labels: string[]; current: string | undefined }> {
  const rows = await db
    .select({ label: examPeriods.label, endsOn: examPeriods.endsOn })
    .from(examPeriods)
    .orderBy(desc(examPeriods.academicYear), desc(examPeriods.term), asc(examPeriods.kind));
  const today = bangkokNow(now).date;
  const upcoming = rows.filter((r) => !r.endsOn || r.endsOn >= today).sort((a, b) => (a.endsOn ?? "").localeCompare(b.endsOn ?? ""));
  return { labels: rows.map((r) => r.label), current: upcoming[0]?.label ?? rows[0]?.label };
}

export async function getRoomSchedule(roomId: string, date: string, session: SessionName): Promise<RoomSchedule | null> {
  const [slot] = await db
    .select({ id: examSlots.id, building: rooms.building, roomNumber: rooms.roomNumber })
    .from(examSlots)
    .innerJoin(rooms, eq(rooms.id, examSlots.roomId))
    .where(and(eq(examSlots.roomId, roomId.toUpperCase()), eq(examSlots.examDate, date), eq(examSlots.session, session)));
  if (!slot) return null;

  const [cs, ps, timing, rulesCues] = await Promise.all([
    coursesOfSlots([slot.id]),
    db
      .select({ staffId: staff.staffId, name: staff.name, role: proctorAssignments.role })
      .from(proctorAssignments)
      .innerJoin(staff, eq(staff.staffId, proctorAssignments.staffId))
      .where(eq(proctorAssignments.slotId, slot.id))
      .orderBy(asc(proctorAssignments.role)),
    getAlertTiming(),
    getRulesCues(),
  ]);

  const { start, end } = SESSIONS[session];
  return {
    room_code: `${slot.building} ${slot.roomNumber}`,
    building: slot.building,
    room_number: slot.roomNumber,
    session,
    date,
    session_start: start,
    session_end: end,
    departure_allowed_at: addMinutes(start, timing.departureAfterMin),
    timing,
    rules_cues: rulesCues,
    proctors: ps.map((p) => ({ staff_id: p.staffId, name: p.name, role: p.role === "HEAD" ? "Head Proctor" : "Proctor" })),
    // หลายกลุ่มเรียน (sec) ของวิชาเดียวกัน เวลาเดียวกัน → การ์ด/ตัวจับเวลาเดียว
    courses: groupSections(cs).map((g): Course => {
      const c = g[0];
      return {
        course_id: String(c.id),
        course_code: c.courseCode,
        course_name: c.courseName,
        section: g.map((x) => x.section).join(", "),
        row_label: c.seatGroup,
        seat_color_theme: c.seatColor,
        seat_description: c.seatGroup ? `Seat ${c.seatGroup}` : "",
        student_id_range: c.studentIdRange ?? "",
        start_time: c.startTime,
        end_time: c.endTime,
        duration_minutes: minutesBetween(c.startTime, c.endTime),
        instructions: c.instructions ?? undefined,
        admin_note: g.map((x) => x.adminNote).filter(Boolean).join(" · ") || undefined,
        completed_at: g.every((x) => x.completedAt) ? c.completedAt!.toISOString() : null,
        sections: g.map((x) => ({ section: x.section, seat_from: x.seatFrom ?? undefined, seat_to: x.seatTo ?? undefined })),
      };
    }),
  };
}

export async function getMyAssignment(_ssoToken: string | null, date: string, session: SessionName): Promise<MyAssignment> {
  // TODO: ระบุตัวผู้ใช้จาก SSO token — ตอนนี้ใช้อาจารย์ Mock Login
  const me = MOCK_USERS.proctor;
  const order = sql`${examSlots.examDate}, ${examSlots.session}`;
  const [next] = await db
    .select({ roomId: examSlots.roomId, date: examSlots.examDate, session: examSlots.session })
    .from(proctorAssignments)
    .innerJoin(examSlots, eq(examSlots.id, proctorAssignments.slotId))
    .where(
      and(
        eq(proctorAssignments.staffId, me.staff_id),
        // วันนี้รอบเดียวกันหรือหลังจากนั้น
        sql`(${examSlots.examDate}, ${examSlots.session}) >= (${date}::date, ${session}::session_name)`,
      ),
    )
    .orderBy(order)
    .limit(1);
  return {
    staff_id: me.staff_id,
    name: me.name,
    next_assignment: next ? { room_id: next.roomId, date: next.date, session: next.session, status: "ready" } : null,
  };
}

/**
 * เวรคุมสอบในช่วงสอบ
 * - อาจารย์/พนักงาน: เฉพาะรอบที่ตัวเองได้รับมอบหมาย
 * - Admin หรือค้นหาห้อง (กรณีคุมสอบแทน): ทุกรอบในช่วงสอบ
 */
export async function getProctorDuties(
  user: AuthUser,
  opts: { period?: string; roomQuery?: string; now?: number } = {},
): Promise<ProctorDuty[]> {
  const now = bangkokNow(opts.now ?? Date.now());
  const q = opts.roomQuery?.trim().toUpperCase().replace(/[\s-]/g, "");
  const conds = [];
  if (opts.period) conds.push(eq(examPeriods.label, opts.period));
  if (q) conds.push(sql`replace(${rooms.id}, '-', '') like ${`%${q}%`}`);
  else if (user.role !== "admin")
    conds.push(
      inArray(
        examSlots.id,
        db.select({ id: proctorAssignments.slotId }).from(proctorAssignments).where(eq(proctorAssignments.staffId, user.staff_id)),
      ),
    );

  const slots = await db
    .select({
      id: examSlots.id,
      period: examPeriods.label,
      date: examSlots.examDate,
      session: examSlots.session,
      roomId: rooms.id,
      building: rooms.building,
      roomNumber: rooms.roomNumber,
    })
    .from(examSlots)
    .innerJoin(examPeriods, eq(examPeriods.id, examSlots.periodId))
    .innerJoin(rooms, eq(rooms.id, examSlots.roomId))
    .where(and(...conds))
    .orderBy(asc(examSlots.examDate), asc(examSlots.session), asc(rooms.id));

  const cs = await coursesOfSlots(slots.map((s) => s.id));

  return slots.map((s): ProctorDuty => {
    const { start, end } = SESSIONS[s.session];
    const startMin = toMin(start);
    const endMin = toMin(end);
    const isToday = s.date === now.date;
    const past = s.date < now.date || (isToday && now.minutes > endMin);
    const canLaunch = isToday && now.minutes >= startMin - 30 && now.minutes <= endMin;
    return {
      dutyId: String(s.id),
      examPeriod: s.period,
      date: s.date,
      session: s.session,
      sessionTime: `${start.slice(0, 5)} - ${end.slice(0, 5)}`,
      building: s.building,
      roomNumber: s.roomNumber,
      roomId: s.roomId,
      isCurrentSession: canLaunch,
      status: past ? "COMPLETED" : canLaunch ? "LIVE" : "UPCOMING",
      canLaunch,
      coursesSummary: groupSections(cs.filter((c) => c.slotId === s.id))
        .map(([c]) => ({ courseCode: c.courseCode, courseName: c.courseName, rowLabel: c.seatGroup, seatColorTheme: c.seatColor })),
    };
  });
}

/** ผังที่นั่งเวอร์ชันปัจจุบันของห้อง */
export async function getRoomLayout(roomId: string): Promise<RoomLayoutResponse | null> {
  if (!/^[A-Za-z0-9-]+$/.test(roomId)) return null;
  const [row] = await db
    .select({ layout: roomLayouts.layout })
    .from(roomLayouts)
    .where(and(eq(roomLayouts.roomId, roomId.toUpperCase()), eq(roomLayouts.isCurrent, true)));
  return row?.layout ?? null;
}

/**
 * ผู้คุมสอบยืนยันว่ารายวิชาสอบเสร็จ/เก็บข้อสอบแล้ว (หรือยกเลิก)
 * อนุญาต: Admin หรือผู้คุมสอบที่ได้รับมอบหมายในรอบนั้น
 */
export async function setCourseCompletion(user: AuthUser, slotCourseId: number, completed: boolean) {
  const [row] = await db
    .select({
      id: slotCourses.id,
      slotId: slotCourses.slotId,
      roomId: examSlots.roomId,
      courseCode: slotCourses.courseCode,
      startTime: slotCourses.startTime,
      endTime: slotCourses.endTime,
    })
    .from(slotCourses)
    .innerJoin(examSlots, eq(examSlots.id, slotCourses.slotId))
    .where(eq(slotCourses.id, slotCourseId));
  if (!row) return { ok: false as const, status: 404 };
  if (user.role !== "admin") {
    const [assigned] = await db
      .select({ id: proctorAssignments.slotId })
      .from(proctorAssignments)
      .where(and(eq(proctorAssignments.slotId, row.slotId), eq(proctorAssignments.staffId, user.staff_id)));
    if (!assigned) return { ok: false as const, status: 403 };
  }
  // ทุกกลุ่มเรียนของวิชาเดียวกันในรอบนี้ (แสดงเป็นการ์ดเดียว) เปลี่ยนสถานะพร้อมกัน
  const [updated] = await db
    .update(slotCourses)
    .set(completed ? { completedAt: new Date(), completedBy: user.staff_id } : { completedAt: null, completedBy: null })
    .where(
      and(
        eq(slotCourses.slotId, row.slotId),
        eq(slotCourses.courseCode, row.courseCode),
        eq(slotCourses.startTime, row.startTime),
        eq(slotCourses.endTime, row.endTime),
      ),
    )
    .returning({ completedAt: slotCourses.completedAt });
  return { ok: true as const, roomId: row.roomId, courseCode: row.courseCode, completedAt: updated.completedAt?.toISOString() ?? null };
}

/**
 * ตารางสอบจำลองจากผังห้อง (ใช้กับ ?demo=1) — ทุกห้องที่มีผังเปิดหน้าจอคุมสอบได้ แม้ไม่มีรอบสอบจริง
 * กลุ่ม A = 3 ชม., กลุ่มอื่น = 2 ชม. · ไม่บันทึกอะไรลงฐานข้อมูล
 */
export async function getDemoSchedule(roomId: string, date: string, session: SessionName): Promise<RoomSchedule | null> {
  const layout = await getRoomLayout(roomId);
  if (!layout) return null;
  const [building, ...rest] = layout.roomId.split("-");
  const [timing, rulesCues] = await Promise.all([getAlertTiming(), getRulesCues()]);
  const { start, end } = SESSIONS[session];
  return {
    room_code: `${building} ${rest.join("-")}`,
    building,
    room_number: rest.join("-"),
    session,
    date,
    session_start: start,
    session_end: end,
    departure_allowed_at: addMinutes(start, timing.departureAfterMin),
    timing,
    rules_cues: rulesCues,
    proctors: [{ staff_id: "demo", name: "Demo Proctor", role: "Head Proctor" }],
    courses: layout.groups.map((g, i): Course => {
      const minutes = i === 0 ? 180 : 120;
      return {
        sections: demoSections(layout, g.key),
        course_id: `demo-${g.key || "1"}`,
        course_code: `DEMO-${g.key || "1"}`,
        course_name: `Demo Course ${g.key || ""}`.trim(),
        section: "1",
        row_label: g.key,
        seat_color_theme: g.colorTheme,
        seat_description: g.key ? `Seat ${g.key}` : "",
        student_id_range: "6700000001 - 6799999999",
        start_time: start,
        end_time: addMinutes(start, minutes),
        duration_minutes: minutes,
        completed_at: null,
      };
    }),
  };
}

/** หน้าจอคุมสอบยังเปิดอยู่ — บันทึกเวลาเปิดครั้งแรก (ครั้งเดียว) และเวลาล่าสุด; ไม่มีรอบสอบจริง (demo) = false */
export async function recordScreenHeartbeat(roomId: string, date: string, session: SessionName, staffId: string | null) {
  const now = new Date();
  const rows = await db
    .update(examSlots)
    .set({
      screenLastSeenAt: now,
      screenOpenedAt: sql`coalesce(${examSlots.screenOpenedAt}, ${now.toISOString()}::timestamptz)`,
      screenOpenedBy: sql`coalesce(${examSlots.screenOpenedBy}, ${staffId}::text)`,
    })
    .where(and(eq(examSlots.roomId, roomId.toUpperCase()), eq(examSlots.examDate, date), eq(examSlots.session, session)))
    .returning({ id: examSlots.id });
  return rows.length > 0;
}
