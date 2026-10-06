// Data contracts — ตรงกับ PRD §5 (API Schemas)

export type SessionName = "morning" | "afternoon";

/** สีป้ายกระดาษที่ติดในห้องสอบ (Physical-to-Screen Seat Color Mapping) */
export type SeatColorTheme = "pink" | "white" | "blue" | "green" | "yellow";

export interface Proctor {
  staff_id: string;
  name: string;
  role: string;
}

export interface Course {
  course_id: string;
  course_code: string;
  course_name: string;
  section: string;
  row_label: string;
  seat_color_theme: SeatColorTheme;
  seat_description: string;
  student_id_range: string;
  /** "HH:MM:SS" */
  start_time: string;
  /** "HH:MM:SS" */
  end_time: string;
  duration_minutes: number;
  instructions?: string;
}

export interface RoomSchedule {
  room_code: string;
  building: string;
  room_number: string;
  session: SessionName;
  /** "YYYY-MM-DD" */
  date: string;
  session_start: string;
  session_end: string;
  departure_allowed_at: string;
  proctors: Proctor[];
  courses: Course[];
}

export interface MyAssignment {
  staff_id: string;
  name: string;
  next_assignment: {
    room_id: string;
    date: string;
    session: SessionName;
    status: "ready" | "none";
  } | null;
}

export interface ServerTime {
  /** epoch ms ของเซิร์ฟเวอร์ (อ้างอิง NTP) */
  epoch_ms: number;
  iso: string;
}

// ---------- Engine ----------

/** PRD §4.1 State Machine */
export type RoomPhase =
  | "IDLE" // ก่อน T-15
  | "PRE_EXAM" // T-15 → T-0
  | "INSTRUCTION" // T-0 → T+5
  | "IN_PROGRESS"
  | "COURSE_PARTIAL_ENDED"
  | "SESSION_ENDED";

export type CourseStatus = "upcoming" | "running" | "warning" | "ended";

export interface CourseState {
  course: Course;
  status: CourseStatus;
  startAt: number;
  endAt: number;
  /** เวลาที่เหลือจนหมดเวลาสอบ (ms) */
  remainingMs: number;
}

export type ExamEventType =
  | "ROOM_OPEN"
  | "EXAM_START"
  | "DEPARTURE_ALLOWED"
  | "COURSE_WARNING"
  | "COURSE_END"
  | "SESSION_END";

export interface ExamEvent {
  id: string;
  type: ExamEventType;
  /** epoch ms */
  at: number;
  courseId?: string;
}

// ---------- v2: Portal / Seating / Auth (Docs/iproctor_mfu_technical_requirements.md §3) ----------

export type UserRole = "proctor" | "admin";

export interface AuthUser {
  staff_id: string;
  name: string;
  role: UserRole;
}

export type ExamPeriod = "Midterm 1/2026" | "Final 1/2026";
export type DutyStatus = "UPCOMING" | "LIVE" | "COMPLETED";

export interface ProctorDuty {
  dutyId: string;
  examPeriod: ExamPeriod;
  /** "YYYY-MM-DD" */
  date: string;
  session: SessionName;
  /** "13:30 - 16:30" */
  sessionTime: string;
  building: string;
  roomNumber: string;
  /** roomId สำหรับ /room/[roomId] เช่น "C3-107" */
  roomId: string;
  isCurrentSession: boolean;
  status: DutyStatus;
  /** เปิดปุ่ม Launch ได้ (ก่อนเริ่ม 30 นาที จนจบรอบ) */
  canLaunch: boolean;
  coursesSummary: Array<{
    courseCode: string;
    courseName: string;
    rowLabel: string;
    seatColorTheme: SeatColorTheme;
  }>;
}

/** กลุ่มที่นั่ง = ตัวอักษรนำเลขที่นั่ง (เช่น "A" → A1, A2, ...) ผูกกับวิชาและสีป้าย */
export interface SeatingGroup {
  key: string;
  colorTheme: SeatColorTheme;
  courseName: string;
  studentIdRange: string;
}

/** แถวแนวนอนหนึ่งแถว (นับจากหน้าห้อง) แบ่งเป็นกลุ่มโต๊ะซ้าย→ขวา; null = เก้าอี้ว่างที่เว้นไว้ */
export interface SeatingRow {
  label: string;
  blocks: Array<Array<string | null>>;
}

/** ผังที่นั่งตามแบบผังจริงของสำนักทะเบียน: แถว × กลุ่มโต๊ะ, เลขที่นั่งระบุตรง ๆ (รองรับเลขวิ่งสลับทิศ) */
export interface RoomLayoutResponse {
  roomId: string;
  title?: string;
  projectorPosition: "FRONT_CENTER";
  doorPositions: Array<"FRONT_LEFT" | "FRONT_RIGHT" | "BACK_LEFT" | "BACK_RIGHT">;
  groups: SeatingGroup[];
  rows: SeatingRow[];
  disabledSeats?: string[];
}
