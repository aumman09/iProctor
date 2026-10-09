import "server-only";

import { eq } from "drizzle-orm";
import { DEFAULT_ALERT_TIMING } from "../config";
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
