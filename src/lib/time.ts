import type { SessionName } from "./types";

// หมายเหตุ: เวลาทั้งหมดคำนวณตาม timezone ของเครื่องที่เปิดหน้าจอ (ควรตั้งเป็น Asia/Bangkok)

const pad = (n: number) => String(n).padStart(2, "0");

/** แปลง "YYYY-MM-DD" + "HH:MM:SS" เป็น epoch ms (local time) */
export function atTime(date: string, hms: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi, s = 0] = hms.split(":").map(Number);
  return new Date(y, m - 1, d, h, mi, s).getTime();
}

/** "13:30:00" + 45 → "14:15:00" */
export function addMinutes(hms: string, minutes: number): string {
  const [h, m, s = 0] = hms.split(":").map(Number);
  const total = h * 3600 + m * 60 + s + minutes * 60;
  return `${pad(Math.floor(total / 3600) % 24)}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
}

/** epoch → "HH:MM:SS" */
export function formatClock(epoch: number): string {
  const d = new Date(epoch);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** ระยะเวลา ms → "HH:MM:SS" (ปัดขึ้นเป็นวินาที เพื่อไม่ให้แสดง 00:00:00 ก่อนหมดเวลาจริง) */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
}

/** "13:30:00" → "13:30" */
export function shortTime(hms: string): string {
  return hms.slice(0, 5);
}

export function todayISO(epoch: number): string {
  const d = new Date(epoch);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** เลือกรอบสอบอัตโนมัติจากเวลาปัจจุบัน (ก่อน 12:45 = เช้า) */
export function guessSession(epoch: number): SessionName {
  const d = new Date(epoch);
  return d.getHours() * 60 + d.getMinutes() < 12 * 60 + 45 ? "morning" : "afternoon";
}

/** แปลง "HH:MM" / "HH:MM:SS" ของวันที่ระบุเป็น epoch (ใช้กับโหมดจำลองเวลา) */
export function parseSimStart(date: string, value: string | undefined): number | null {
  if (!value || !/^\d{1,2}:\d{2}(:\d{2})?$/.test(value)) return null;
  return atTime(date, value);
}
