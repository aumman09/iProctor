import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getProctorDuties } from "@/lib/server/data-source";
import type { ExamPeriod } from "@/lib/types";

// GET /api/v1/proctor/duties?period=Midterm%201/2026&room=C3-107
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const period = req.nextUrl.searchParams.get("period");
  const room = req.nextUrl.searchParams.get("room") ?? undefined;
  const duties = await getProctorDuties(user, {
    period: period === "Midterm 1/2026" || period === "Final 1/2026" ? (period as ExamPeriod) : undefined,
    roomQuery: room,
  });
  return Response.json(duties);
}
