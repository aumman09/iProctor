import "server-only";

// ข้อมูลสำหรับ Admin Panel (/admin) — dashboard, รายการรอบสอบ, ห้องสอบ

import { and, asc, count, countDistinct, desc, eq, gte, inArray, sql } from "drizzle-orm";
import type { SessionName } from "../types";
import { db } from "./db";
import { courses, examPeriods, examSlots, proctorAssignments, roomLayouts, rooms, slotCourses, staff, usageEvents } from "./db/schema";

const BKK = "Asia/Bangkok";
export const bangkokToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: BKK }).format(new Date());
/** เวลาเที่ยงคืน (Asia/Bangkok) ของวันที่ระบุ */
const bkkMidnight = (date: string) => new Date(`${date}T00:00:00+07:00`);

export function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** ตัวเลขการใช้งานวันนี้ + 7 วันล่าสุด */
export async function getUsageSummary() {
  const today = bangkokToday();
  const since7 = bkkMidnight(shiftDate(today, -6));
  const sinceToday = bkkMidnight(today);
  const day = sql<string>`to_char(${usageEvents.createdAt} at time zone 'Asia/Bangkok', 'YYYY-MM-DD')`;

  const [todayRows, weekUsers, series] = await Promise.all([
    db.select({ type: usageEvents.type, n: count() }).from(usageEvents).where(gte(usageEvents.createdAt, sinceToday)).groupBy(usageEvents.type),
    db
      .select({ n: countDistinct(usageEvents.staffId) })
      .from(usageEvents)
      .where(and(gte(usageEvents.createdAt, since7), sql`${usageEvents.staffId} is not null`)),
    db
      .select({ day, n: count() })
      .from(usageEvents)
      .where(and(gte(usageEvents.createdAt, since7), inArray(usageEvents.type, ["LOGIN", "PORTAL_VIEW", "ROOM_OPEN", "SEATING_VIEW"])))
      .groupBy(day),
  ]);

  const byType = Object.fromEntries(todayRows.map((r) => [r.type, r.n])) as Record<string, number>;
  const perDay = new Map(series.map((r) => [r.day, r.n]));
  return {
    today: {
      logins: byType.LOGIN ?? 0,
      roomOpens: byType.ROOM_OPEN ?? 0,
      seatingViews: byType.SEATING_VIEW ?? 0,
      completions: byType.COURSE_COMPLETED ?? 0,
    },
    activeUsers7d: weekUsers[0]?.n ?? 0,
    /** จำนวนการใช้งาน (login, portal, จอคุมสอบ, ผังที่นั่ง) รายวัน 7 วันล่าสุด */
    daily: Array.from({ length: 7 }, (_, i) => {
      const d = shiftDate(today, i - 6);
      return { date: d, count: perDay.get(d) ?? 0 };
    }),
  };
}

export async function getRecentActivity(limit = 12) {
  return db
    .select({
      id: usageEvents.id,
      type: usageEvents.type,
      roomId: usageEvents.roomId,
      meta: usageEvents.meta,
      createdAt: usageEvents.createdAt,
      name: staff.name,
    })
    .from(usageEvents)
    .leftJoin(staff, eq(staff.staffId, usageEvents.staffId))
    .where(inArray(usageEvents.type, ["COURSE_COMPLETED", "COURSE_REOPENED", "NOTE_UPDATED", "SETTINGS_UPDATED", "LOGIN"]))
    .orderBy(desc(usageEvents.createdAt))
    .limit(limit);
}

export interface ExamCourseRow {
  id: number;
  courseCode: string;
  courseName: string;
  section: string;
  seatGroup: string;
  seatColor: "pink" | "white" | "blue" | "green" | "yellow";
  startTime: string;
  endTime: string;
  adminNote: string | null;
  completedAt: Date | null;
  completedByName: string | null;
}
/** สถานะหน้าจอคุมสอบ: live = ส่งสัญญาณภายใน 3 นาที, stale = เคยเปิดแต่ขาดสัญญาณ, null = ยังไม่เคยเปิด */
export type ScreenState = { state: "live" | "stale"; openedAt: Date; lastSeenAt: Date; openedBy: string | null } | null;
const LIVE_WINDOW_MS = 3 * 60_000;

export interface ExamSlotRow {
  slotId: number;
  screen: ScreenState;
  roomId: string;
  building: string;
  roomNumber: string;
  date: string;
  session: SessionName;
  period: string;
  proctors: Array<{ name: string; role: "HEAD" | "ASSISTANT" }>;
  courses: ExamCourseRow[];
}

/** รอบสอบพร้อมรายวิชา/ผู้คุมสอบ/สถานะ — กรองตามช่วงสอบ วันที่ รอบ สถานะ และค้นหา (ห้อง/รหัสวิชา/ชื่อวิชา) */
export async function getExamOverview(f: {
  period?: string;
  date?: string;
  session?: SessionName;
  status?: "done" | "pending";
  q?: string;
}): Promise<ExamSlotRow[]> {
  const conds = [];
  if (f.period) conds.push(eq(examPeriods.label, f.period));
  if (f.date) conds.push(eq(examSlots.examDate, f.date));
  if (f.session) conds.push(eq(examSlots.session, f.session));

  const slots = await db
    .select({
      slotId: examSlots.id,
      roomId: rooms.id,
      building: rooms.building,
      roomNumber: rooms.roomNumber,
      date: examSlots.examDate,
      session: examSlots.session,
      period: examPeriods.label,
      screenOpenedAt: examSlots.screenOpenedAt,
      screenLastSeenAt: examSlots.screenLastSeenAt,
      screenOpenedBy: sql<string | null>`(select ${staff.name} from ${staff} where ${staff.staffId} = ${examSlots.screenOpenedBy})`,
    })
    .from(examSlots)
    .innerJoin(rooms, eq(rooms.id, examSlots.roomId))
    .innerJoin(examPeriods, eq(examPeriods.id, examSlots.periodId))
    .where(and(...conds))
    .orderBy(asc(examSlots.examDate), asc(examSlots.session), asc(rooms.id));
  if (!slots.length) return [];

  const ids = slots.map((s) => s.slotId);
  const completer = sql<string | null>`(select ${staff.name} from ${staff} where ${staff.staffId} = ${slotCourses.completedBy})`;
  const [cs, ps] = await Promise.all([
    db
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
        adminNote: slotCourses.adminNote,
        completedAt: slotCourses.completedAt,
        completedByName: completer,
      })
      .from(slotCourses)
      .innerJoin(courses, eq(courses.courseCode, slotCourses.courseCode))
      .where(inArray(slotCourses.slotId, ids))
      .orderBy(asc(slotCourses.seatGroup), asc(slotCourses.courseCode)),
    db
      .select({ slotId: proctorAssignments.slotId, name: staff.name, role: proctorAssignments.role })
      .from(proctorAssignments)
      .innerJoin(staff, eq(staff.staffId, proctorAssignments.staffId))
      .where(inArray(proctorAssignments.slotId, ids))
      .orderBy(asc(proctorAssignments.role), asc(staff.name)),
  ]);

  const q = f.q?.trim().toLowerCase().replace(/[\s-]/g, "");
  const now = Date.now();
  return slots
    .map(({ screenOpenedAt, screenLastSeenAt, screenOpenedBy, ...s }) => ({
      ...s,
      screen:
        screenOpenedAt && screenLastSeenAt
          ? {
              state: now - screenLastSeenAt.getTime() <= LIVE_WINDOW_MS ? ("live" as const) : ("stale" as const),
              openedAt: screenOpenedAt,
              lastSeenAt: screenLastSeenAt,
              openedBy: screenOpenedBy,
            }
          : null,
      proctors: ps.filter((p) => p.slotId === s.slotId).map(({ name, role }) => ({ name, role })),
      courses: cs
        .filter((c) => c.slotId === s.slotId)
        .filter((c) => !f.status || (f.status === "done" ? !!c.completedAt : !c.completedAt))
        .filter(
          (c) =>
            !q ||
            s.roomId.toLowerCase().replace("-", "").includes(q) ||
            c.courseCode.includes(q) ||
            c.courseName.toLowerCase().replace(/\s/g, "").includes(q),
        ),
    }))
    .filter((s) => s.courses.length > 0);
}

/** ความคืบหน้าการส่งข้อสอบ (จากการกด "Mark as completed") ของช่วงสอบ */
export async function getCompletionStats(period?: string) {
  const slots = await getExamOverview({ period });
  const all = slots.flatMap((s) => s.courses);
  const done = all.filter((c) => c.completedAt).length;
  const roomsDone = slots.filter((s) => s.courses.every((c) => c.completedAt)).length;
  const today = bangkokToday();
  const todays = slots.filter((s) => s.date === today);
  return {
    courses: all.length,
    coursesDone: done,
    slots: slots.length,
    slotsDone: roomsDone,
    rooms: new Set(slots.map((s) => s.roomId)).size,
    liveNow: slots.filter((s) => s.screen?.state === "live").length,
    todaySlots: todays,
  };
}

export async function listRoomsWithLayouts() {
  return db
    .select({
      id: rooms.id,
      building: rooms.building,
      roomNumber: rooms.roomNumber,
      capacity: rooms.capacity,
      version: roomLayouts.version,
      layout: roomLayouts.layout,
      importedAt: roomLayouts.importedAt,
    })
    .from(rooms)
    .innerJoin(roomLayouts, and(eq(roomLayouts.roomId, rooms.id), eq(roomLayouts.isCurrent, true)))
    .orderBy(asc(rooms.building), asc(rooms.id));
}
