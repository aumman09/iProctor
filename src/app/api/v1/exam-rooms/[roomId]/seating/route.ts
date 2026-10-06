import { getRoomLayout } from "@/lib/server/data-source";

// GET /api/v1/exam-rooms/{roomId}/seating
export async function GET(_req: Request, ctx: RouteContext<"/api/v1/exam-rooms/[roomId]/seating">) {
  const { roomId } = await ctx.params;
  const layout = await getRoomLayout(decodeURIComponent(roomId));
  if (!layout) return Response.json({ error: "room not found" }, { status: 404 });
  return Response.json(layout);
}
