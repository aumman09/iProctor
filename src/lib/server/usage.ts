import "server-only";

import { db } from "./db";
import { usageEvents } from "./db/schema";

type UsageType = (typeof usageEvents.$inferInsert)["type"];

/** บันทึกการใช้งาน (dashboard Admin) — ล้มเหลวได้โดยไม่กระทบผู้ใช้ */
export async function logUsage(type: UsageType, data: { staffId?: string | null; roomId?: string | null; meta?: Record<string, unknown> } = {}) {
  try {
    await db.insert(usageEvents).values({ type, staffId: data.staffId ?? null, roomId: data.roomId ?? null, meta: data.meta });
  } catch (e) {
    console.error("logUsage failed", e);
  }
}
