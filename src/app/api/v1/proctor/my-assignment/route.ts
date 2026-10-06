import type { NextRequest } from "next/server";
import { getMyAssignment } from "@/lib/server/data-source";
import { guessSession, todayISO } from "@/lib/time";

// GET /api/v1/proctor/my-assignment   (Authorization: Bearer <SSO_TOKEN>)
export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  // TODO: ปฏิเสธคำขอที่ไม่มี token เมื่อเชื่อม MFU SSO แล้ว
  const now = Date.now();
  return Response.json(await getMyAssignment(token, todayISO(now), guessSession(now)));
}
