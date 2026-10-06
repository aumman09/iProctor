import type { NextRequest } from "next/server";
import { getRoomSchedule } from "@/lib/server/data-source";
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

  const schedule = await getRoomSchedule(roomId, date, session as SessionName);
  if (!schedule) return Response.json({ error: "room not found" }, { status: 404 });
  return Response.json(schedule);
}
