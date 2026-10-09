import { getCurrentUser } from "@/lib/server/auth";
import { recordScreenHeartbeat } from "@/lib/server/data-source";

// POST /api/v1/exam-rooms/{roomId}/heartbeat   body: { "date": "YYYY-MM-DD", "session": "morning" | "afternoon" }
// หน้าจอคุมสอบส่งทุก 1 นาทีขณะเปิดอยู่ → Admin เห็นไฟเขียว "กำลังคุมสอบ"
export async function POST(req: Request, ctx: RouteContext<"/api/v1/exam-rooms/[roomId]/heartbeat">) {
  const { roomId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { date?: unknown; session?: unknown } | null;
  const date = typeof body?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : null;
  const session = body?.session === "morning" || body?.session === "afternoon" ? body.session : null;
  if (!date || !session) return Response.json({ error: "invalid request" }, { status: 400 });

  const ok = await recordScreenHeartbeat(decodeURIComponent(roomId), date, session, (await getCurrentUser())?.staff_id ?? null);
  return ok ? new Response(null, { status: 204 }) : Response.json({ error: "slot not found" }, { status: 404 });
}
