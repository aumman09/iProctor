import "server-only";

import { eq } from "drizzle-orm";
import { DEFAULT_ALERT_TIMING } from "../config";
import { DEFAULT_RULES_CUES, RULES_CUE_COUNT } from "../exam-rules";
import type { AlertTiming } from "../types";
import { db } from "./db";
import { appSettings } from "./db/schema";

const KEY = "alert_timing";

/** ตรวจ/ปรับค่าให้อยู่ในช่วงที่สมเหตุสมผล — คืน null ถ้าใช้ไม่ได้ */
export function normalizeTiming(v: Partial<AlertTiming>): AlertTiming | null {
  const int = (n: unknown, min: number, max: number) =>
    typeof n === "number" && Number.isInteger(n) && n >= min && n <= max ? n : null;
  const roomOpen = int(v.roomOpenBeforeMin, 0, 120);
  const departure = int(v.departureAfterMin, 0, 240);
  const warnings = Array.isArray(v.warningsBeforeEndMin) ? v.warningsBeforeEndMin.map((m) => int(m, 1, 120)) : [];
  if (roomOpen === null || departure === null || warnings.some((m) => m === null)) return null;
  return {
    roomOpenBeforeMin: roomOpen,
    departureAfterMin: departure,
    // ไม่ซ้ำ เรียงจากมากไปน้อย (เช่น 15, 10, 5)
    warningsBeforeEndMin: [...new Set(warnings as number[])].sort((a, b) => b - a).slice(0, 5),
  };
}

export async function getAlertTiming(): Promise<AlertTiming> {
  const [row] = await db.select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, KEY));
  return (row && normalizeTiming(row.value as Partial<AlertTiming>)) || DEFAULT_ALERT_TIMING;
}

export async function saveAlertTiming(timing: AlertTiming, staffId: string) {
  await db
    .insert(appSettings)
    .values({ key: KEY, value: timing, updatedBy: staffId })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: timing, updatedBy: staffId, updatedAt: new Date() } });
}

const CUES_KEY = "rules_cues";

/** เวลาเริ่มแต่ละช่วงของเสียงระเบียบการสอบ: ต้องครบทุกช่วง เรียงจากน้อยไปมาก 0–600 วินาที */
export function normalizeCues(v: unknown): number[] | null {
  if (!Array.isArray(v) || v.length !== RULES_CUE_COUNT) return null;
  const cues = v.map((n) => (typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 600 ? Math.round(n * 10) / 10 : NaN));
  if (cues.some(Number.isNaN) || cues.some((c, i) => i > 0 && c <= cues[i - 1])) return null;
  return cues;
}

export async function getRulesCues(): Promise<number[]> {
  const [row] = await db.select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, CUES_KEY));
  return (row && normalizeCues(row.value)) || DEFAULT_RULES_CUES;
}

export async function saveRulesCues(cues: number[], staffId: string) {
  await db
    .insert(appSettings)
    .values({ key: CUES_KEY, value: cues, updatedBy: staffId })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: cues, updatedBy: staffId, updatedAt: new Date() } });
}
