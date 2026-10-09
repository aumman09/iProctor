// นำเข้าผังห้อง (JSON ที่ได้จาก scripts/seating/import_pdf.py) เข้าฐานข้อมูล
// ผังเปลี่ยน = เพิ่มเวอร์ชันใหม่และตั้งเป็นปัจจุบัน; ผังเหมือนเดิม = ไม่ทำอะไร

import { and, desc, eq } from "drizzle-orm";
import type { DB } from "../db";
import { importRuns, roomLayouts, rooms } from "../db/schema";
import type { RoomLayoutResponse } from "../../types";

/** JSON ที่เรียง key ก่อน — jsonb ของ Postgres สลับลำดับ key จึงเทียบ JSON.stringify ตรง ๆ ไม่ได้ */
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object")
    return `{${Object.keys(v)
      .sort()
      .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  return JSON.stringify(v);
}

export async function importLayouts(db: DB, layouts: RoomLayoutResponse[], source: string) {
  const [run] = await db.insert(importRuns).values({ source }).returning({ id: importRuns.id });
  const stats = { rooms: layouts.length, added: 0, updated: 0, unchanged: 0 };

  await db.transaction(async (tx) => {
    for (const layout of layouts) {
      const id = layout.roomId.toUpperCase();
      const [building, ...rest] = id.split("-");
      await tx
        .insert(rooms)
        .values({ id, building, roomNumber: rest.join("-"), capacity: layout.seats.length })
        .onConflictDoUpdate({ target: rooms.id, set: { capacity: layout.seats.length, updatedAt: new Date() } });

      const [current] = await tx
        .select({ id: roomLayouts.id, version: roomLayouts.version, layout: roomLayouts.layout })
        .from(roomLayouts)
        .where(eq(roomLayouts.roomId, id))
        .orderBy(desc(roomLayouts.version))
        .limit(1);
      if (current && canonical(current.layout) === canonical(layout)) {
        stats.unchanged++;
        continue;
      }
      await tx.update(roomLayouts).set({ isCurrent: false }).where(and(eq(roomLayouts.roomId, id), eq(roomLayouts.isCurrent, true)));
      await tx.insert(roomLayouts).values({
        roomId: id,
        version: (current?.version ?? 0) + 1,
        layout,
        sourceFile: layout.source?.file,
      });
      if (current) stats.updated++;
      else stats.added++;
    }
  });

  await db.update(importRuns).set({ status: "SUCCESS", finishedAt: new Date(), stats }).where(eq(importRuns.id, run.id));
  return stats;
}
