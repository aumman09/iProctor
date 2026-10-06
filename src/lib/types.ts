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
