import type { ServerTime } from "@/lib/types";

// NTP Sync Endpoint — client ใช้คำนวณ offset ระหว่างนาฬิกาเครื่องกับเวลาเซิร์ฟเวอร์
export const dynamic = "force-dynamic";

export async function GET() {
  const now = Date.now();
  const body: ServerTime = { epoch_ms: now, iso: new Date(now).toISOString() };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
