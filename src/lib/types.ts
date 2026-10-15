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
  /** ข้อกำหนดเพิ่มเติมจาก Admin */
  admin_note?: string;
  /** ISO time ที่ผู้คุมสอบกดยืนยันว่าสอบเสร็จ (null = ยังไม่เสร็จ) */
  completed_at?: string | null;
}

/** เวลาแจ้งเตือนที่ Admin ตั้งได้ (หน้า /admin/settings) */
export interface AlertTiming {
  /** เปิดห้อง/แสดงผังที่นั่งก่อนเริ่มสอบ (นาที) */
  roomOpenBeforeMin: number;
  /** อนุญาตให้ออกจากห้องหลังเริ่มสอบ (นาที) */
  departureAfterMin: number;
  /** เตือนก่อนหมดเวลารายวิชา (นาที) เช่น [10] หรือ [15, 5] */
  warningsBeforeEndMin: number[];
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
  /** ไม่มี (cache เก่า) = ใช้ค่าเริ่มต้นใน config.ts */
  timing?: AlertTiming;
  /** วินาทีเริ่มแต่ละช่วงของเสียงระเบียบการสอบ (ไฮไลต์ข้อที่กำลังอ่าน) */
  rules_cues?: number[];
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
  /** COURSE_WARNING: เหลือกี่นาที */
  minutesLeft?: number;
}

// ---------- v2: Portal / Seating / Auth (Docs/iproctor_mfu_technical_requirements.md §3) ----------

export type UserRole = "proctor" | "admin";

export interface AuthUser {
  staff_id: string;
  name: string;
  role: UserRole;
}

/** ชื่อช่วงสอบ เช่น "Midterm 1/2026" (มาจากตาราง exam_periods) */
export type ExamPeriod = string;
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

/**
 * กลุ่มที่นั่ง = ตัวอักษรนำเลขที่นั่ง (เช่น "A" → A1, A2, ...; "" = เลขล้วน) + สีป้ายกระดาษ
 * courseName/studentIdRange เป็นข้อมูลรายรอบสอบ — ผังที่แปลงจาก PDF จะยังไม่มี
 */
export interface SeatingGroup {
  key: string;
  colorTheme: SeatColorTheme;
  courseName?: string;
  studentIdRange?: string;
}

export type Wall = "TOP" | "BOTTOM" | "LEFT" | "RIGHT";

/** กล่องในพิกัดห้อง (หน่วย pt ของ PDF, มุมซ้ายบนด้านในห้อง = 0,0) */
export interface LayoutBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** เลขที่นั่ง — x, y = จุดกึ่งกลางของตัวเลขบนผัง */
export interface LayoutSeat {
  id: string;
  x: number;
  y: number;
  group: string;
}

/**
 * ผังที่นั่งตามแบบผังจริง (ตำแหน่งโต๊ะ/เก้าอี้/ประตูตามต้นฉบับ) — หน้าห้อง (ไวท์บอร์ด) อยู่ด้านบนเสมอ
 * สร้างจาก PDF สำนักทะเบียนด้วย scripts/seating/import_pdf.py
 */
export interface RoomLayoutResponse {
  roomId: string;
  title?: string;
  /** ขนาดด้านในห้อง */
  size: { w: number; h: number };
  /** ขนาดตัวเลขที่นั่งในต้นฉบับ (pt) ใช้คำนวณขนาดตัวอักษรบนจอ */
  labelSize?: number;
  whiteboard?: LayoutBox;
  /** at = ตำแหน่งตามแนวผนัง 0..1 (ซ้าย→ขวา หรือ บน→ล่าง) */
  doors: Array<{ wall: Wall; at: number }>;
  groups: SeatingGroup[];
  seats: LayoutSeat[];
  desks?: LayoutBox[];
  /** seat = เลขที่นั่งของเก้าอี้ตัวนั้น; ไม่มี = เก้าอี้ว่างที่เว้นไว้ */
  chairs?: Array<LayoutBox & { seat?: string }>;
  /** ป้ายแถว เช่น "Row 1" (อาจอยู่นอกผนัง: x < 0 หรือ x > size.w) */
  rowLabels?: Array<{ label: string; x: number; y: number }>;
  disabledSeats?: string[];
  /** ที่มา (ไฟล์ PDF, หน้า, ฝั่งไวท์บอร์ดในต้นฉบับ) */
  source?: { file: string; page: number; front: Wall };
}
