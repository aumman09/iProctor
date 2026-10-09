import { getCurrentUser } from "@/lib/server/auth";
import { setCourseCompletion } from "@/lib/server/data-source";
import { logUsage } from "@/lib/server/usage";

// POST /api/v1/slot-courses/{id}/completion   body: { "completed": true | false }
// ผู้คุมสอบยืนยันว่ารายวิชาสอบเสร็จ/เก็บข้อสอบแล้ว → แสดงใน dashboard ของ Admin
export async function POST(req: Request, ctx: RouteContext<"/api/v1/slot-courses/[id]/completion">) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const id = Number((await ctx.params).id);
  const body = (await req.json().catch(() => null)) as { completed?: unknown } | null;
  if (!Number.isInteger(id) || typeof body?.completed !== "boolean") {
    return Response.json({ error: "invalid request" }, { status: 400 });
  }

  const r = await setCourseCompletion(user, id, body.completed);
  if (!r.ok) return Response.json({ error: r.status === 404 ? "not found" : "forbidden" }, { status: r.status });

  await logUsage(body.completed ? "COURSE_COMPLETED" : "COURSE_REOPENED", {
    staffId: user.staff_id,
    roomId: r.roomId,
    meta: { slotCourseId: id, courseCode: r.courseCode },
  });
  return Response.json({ completed_at: r.completedAt });
}
