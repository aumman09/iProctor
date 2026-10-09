import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getDemoSchedule, getRoomSchedule } from "@/lib/server/data-source";
import { logUsage } from "@/lib/server/usage";
import type { SessionName } from "@/lib/types";

// GET /api/v1/exam-rooms/{room_id}/schedule?date=YYYY-MM-DD&session=morning|afternoon
export async function GET(req: NextRequest, ctx: RouteContext<"/api/v1/exam-rooms/[roomId]/schedule">) {
  const { roomId } = await ctx.params;
  const date = req.nextUrl.searchParams.get("date");
  const session = req.nextUrl.searchParams.get("session");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "invalid date (YYYY-MM-DD)" }, { status: 400 });
  }
  if (session !== "morning" && session !== "afternoon") {
    return Response.json({ error: "invalid session (morning|afternoon)" }, { status: 400 });
  }

  // ?demo=1 → ห้องที่ไม่มีรอบสอบจริงใช้ตารางจำลองจากผังห้อง (ทดสอบหน้าจอกับผังทุกห้อง)
  const demo = req.nextUrl.searchParams.get("demo") === "1";
  const real = await getRoomSchedule(roomId, date, session as SessionName);
  const schedule = real ?? (demo ? await getDemoSchedule(roomId, date, session as SessionName) : null);
  if (!schedule) return Response.json({ error: "room not found" }, { status: 404 });
  if (!real) return Response.json(schedule);
  // dashboard: นับจำนวนครั้งที่เปิดหน้าจอคุมสอบ
  await logUsage("ROOM_OPEN", { staffId: (await getCurrentUser())?.staff_id, roomId: roomId.toUpperCase(), meta: { date, session } });
  return Response.json(schedule);
}
