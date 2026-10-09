// Database schema (PostgreSQL + Drizzle) — ดู Docs/HANDOFF.md หัวข้อ Database
// ข้อมูลรายเทอมนำเข้าจาก Blendata (src/lib/server/import), ผังห้องนำเข้าจาก PDF สำนักทะเบียน (scripts/seating)

import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  time,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { RoomLayoutResponse } from "../../types";

export const examKind = pgEnum("exam_kind", ["MIDTERM", "FINAL"]);
export const sessionName = pgEnum("session_name", ["morning", "afternoon"]);
export const staffType = pgEnum("staff_type", ["LECTURER", "STAFF"]);
export const proctorRole = pgEnum("proctor_role", ["HEAD", "ASSISTANT"]);
export const seatColor = pgEnum("seat_color", ["pink", "white", "blue", "green", "yellow"]);
export const importStatus = pgEnum("import_status", ["RUNNING", "SUCCESS", "FAILED"]);
export const usageType = pgEnum("usage_type", [
  "LOGIN",
  "PORTAL_VIEW",
  "ROOM_OPEN",
  "SEATING_VIEW",
  "COURSE_COMPLETED",
  "COURSE_REOPENED",
  "NOTE_UPDATED",
  "SETTINGS_UPDATED",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

/** อาจารย์และพนักงานที่คุมสอบ — staff_id = รหัสพนักงานจาก Blendata/SSO */
export const staff = pgTable("staff", {
  staffId: text("staff_id").primaryKey(),
  name: text("name").notNull(),
  type: staffType("type").notNull(),
  email: text("email"),
  ...timestamps,
});

/** ช่วงสอบ เช่น Midterm 1/2026 */
export const examPeriods = pgTable(
  "exam_periods",
  {
    id: text("id").primaryKey(), // "2026-1-MIDTERM"
    academicYear: integer("academic_year").notNull(),
    term: integer("term").notNull(),
    kind: examKind("kind").notNull(),
    label: text("label").notNull(), // "Midterm 1/2026"
    startsOn: date("starts_on"),
    endsOn: date("ends_on"),
    ...timestamps,
  },
  (t) => [uniqueIndex("exam_periods_year_term_kind").on(t.academicYear, t.term, t.kind)],
);

/** ห้องสอบ — id ตรงกับชื่อไฟล์ผัง เช่น "C5-302" */
export const rooms = pgTable("rooms", {
  id: text("id").primaryKey(),
  building: text("building").notNull(),
  roomNumber: text("room_number").notNull(),
  capacity: integer("capacity"),
  ...timestamps,
});

/** ผังที่นั่งรายห้อง เก็บเป็นเวอร์ชัน (นำเข้า PDF ชุดใหม่ = เวอร์ชันใหม่) */
export const roomLayouts = pgTable(
  "room_layouts",
  {
    id: serial("id").primaryKey(),
    roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    isCurrent: boolean("is_current").notNull().default(true),
    layout: jsonb("layout").$type<RoomLayoutResponse>().notNull(),
    sourceFile: text("source_file"),
    /** ลิงก์ PDF ต้นฉบับใน MinIO (ถ้ามี) */
    sourceUrl: text("source_url"),
    importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("room_layouts_room_version").on(t.roomId, t.version),
    uniqueIndex("room_layouts_one_current").on(t.roomId).where(sql`${t.isCurrent}`),
  ],
);

export const courses = pgTable("courses", {
  courseCode: text("course_code").primaryKey(),
  courseName: text("course_name").notNull(),
  ...timestamps,
});

/** รอบสอบของห้อง (วันที่ + เช้า/บ่าย) */
export const examSlots = pgTable(
  "exam_slots",
  {
    id: serial("id").primaryKey(),
    periodId: text("period_id").notNull().references(() => examPeriods.id, { onDelete: "cascade" }),
    roomId: text("room_id").notNull().references(() => rooms.id),
    examDate: date("exam_date").notNull(),
    session: sessionName("session").notNull(),
    /** หน้าจอคุมสอบของรอบนี้เปิดครั้งแรก / ส่งสัญญาณล่าสุด (heartbeat ทุก 1 นาที) → ไฟสถานะใน Admin */
    screenOpenedAt: timestamp("screen_opened_at", { withTimezone: true }),
    screenLastSeenAt: timestamp("screen_last_seen_at", { withTimezone: true }),
    screenOpenedBy: text("screen_opened_by"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("exam_slots_room_date_session").on(t.roomId, t.examDate, t.session),
    index("exam_slots_period_date").on(t.periodId, t.examDate),
  ],
);

/** วิชาที่สอบในรอบนั้น + กลุ่มที่นั่ง (A/B) และสีป้าย */
export const slotCourses = pgTable(
  "slot_courses",
  {
    id: serial("id").primaryKey(),
    slotId: integer("slot_id").notNull().references(() => examSlots.id, { onDelete: "cascade" }),
    courseCode: text("course_code").notNull().references(() => courses.courseCode),
    section: text("section").notNull().default("1"),
    /** ตัวอักษรนำเลขที่นั่งในผัง ("A", "B" หรือ "" = เลขล้วน) */
    seatGroup: text("seat_group").notNull().default(""),
    seatColor: seatColor("seat_color").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    studentIdRange: text("student_id_range"),
    instructions: text("instructions"),
    /** ข้อกำหนดเพิ่มเติมจาก Admin — แสดงบนการ์ดรายวิชาในหน้าจอคุมสอบ (การนำเข้าไม่ทับ) */
    adminNote: text("admin_note"),
    /** ผู้คุมสอบกดยืนยันว่าสอบเสร็จ/เก็บข้อสอบแล้ว (การนำเข้าไม่ทับ) */
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedBy: text("completed_by").references(() => staff.staffId),
    ...timestamps,
  },
  (t) => [uniqueIndex("slot_courses_slot_course_section").on(t.slotId, t.courseCode, t.section)],
);

/** ผู้คุมสอบประจำรอบ */
export const proctorAssignments = pgTable(
  "proctor_assignments",
  {
    slotId: integer("slot_id").notNull().references(() => examSlots.id, { onDelete: "cascade" }),
    staffId: text("staff_id").notNull().references(() => staff.staffId),
    role: proctorRole("role").notNull().default("ASSISTANT"),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.slotId, t.staffId] }), index("proctor_assignments_staff").on(t.staffId)],
);

/** ประวัติการนำเข้าข้อมูล (Blendata / seed) */
export const importRuns = pgTable("import_runs", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(),
  periodId: text("period_id"),
  status: importStatus("status").notNull().default("RUNNING"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  stats: jsonb("stats").$type<Record<string, number>>(),
  warnings: jsonb("warnings").$type<string[]>(),
  error: text("error"),
});

/** บันทึกการใช้งานสำหรับ dashboard ของ Admin */
export const usageEvents = pgTable(
  "usage_events",
  {
    id: serial("id").primaryKey(),
    type: usageType("type").notNull(),
    staffId: text("staff_id"),
    roomId: text("room_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("usage_events_type_created").on(t.type, t.createdAt)],
);

/** ค่าตั้งระบบที่ Admin แก้ได้ (เช่น เวลาแจ้งเตือน) */
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
