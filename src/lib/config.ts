import type { SessionName } from "./types";

/** รอบสอบมาตรฐาน มฟล. (PRD §2) */
export const SESSIONS: Record<SessionName, { start: string; end: string; label: string }> = {
  morning: { start: "09:00:00", end: "12:00:00", label: "Morning Session" },
  afternoon: { start: "13:30:00", end: "16:30:00", label: "Afternoon Session" },
};

/** กฎเวลาแจ้งเตือน (PRD §2.1) */
export const TIMING = {
  roomOpenBeforeMin: 15, // T-15 เปิดห้อง
  instructionMin: 5, // T-0 → T+5 แสดงสไลด์ระเบียบการสอบ
  departureAfterMin: 45, // T+45 อนุญาตให้ออกจากห้อง
  warningBeforeEndMin: 10, // End-10 เตือนรายวิชา
  /** ถ้าเปิดหน้าช้ากว่าเหตุการณ์เกินค่านี้ จะไม่เล่นเสียง/ไม่เด้งแจ้งเตือนย้อนหลัง */
  eventGraceSec: 90,
  /** ซิงก์เวลากับเซิร์ฟเวอร์ใหม่ทุก ๆ */
  resyncEveryMin: 10,
};

/** ค่าเริ่มต้นของเวลาแจ้งเตือน — Admin เปลี่ยนได้ที่ /admin/settings (เก็บในตาราง app_settings) */
export const DEFAULT_ALERT_TIMING = {
  roomOpenBeforeMin: TIMING.roomOpenBeforeMin,
  departureAfterMin: TIMING.departureAfterMin,
  warningsBeforeEndMin: [TIMING.warningBeforeEndMin],
};

/** รายการไฟล์เสียง — วางไฟล์จริงไว้ที่ public/audio/ (ถ้าไม่มีไฟล์ ระบบจะเล่นเสียง chime สังเคราะห์แทน) */
export const AUDIO_CUES = {
  welcome: "/audio/01_welcome_entry.mp3", // T-15 เปิดห้อง / ประกาศต้อนรับ
  rules: "/audio/02_exam_rules.mp3", // T-0 เริ่มสอบ / อ่านระเบียบการสอบ
  departure: "/audio/chime_45min_leave.mp3", // T+45 อนุญาตให้ออกจากห้อง
  warning: "/audio/chime_10min_warning.mp3", // End-10 เตือนรายวิชา
  timeout: "/audio/chime_timeout.mp3", // หมดเวลาสอบรายวิชา
} as const;

export type AudioCue = keyof typeof AUDIO_CUES;
