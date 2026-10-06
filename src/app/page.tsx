import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getMyAssignment } from "@/lib/server/data-source";
import { guessSession, todayISO } from "@/lib/time";

// Direct Next Assignment Routing: เข้าสู่ระบบแล้วพาไปห้องสอบที่ได้รับมอบหมายทันที
export default async function Home() {
  await connection(); // ต้องคำนวณตอน request (ไม่ prerender ตอน build)
  // TODO: อ่าน SSO session จาก cookie — ถ้ายังไม่ login ให้ redirect("/login")
  const now = Date.now();
  const me = await getMyAssignment(null, todayISO(now), guessSession(now));
  if (!me.next_assignment) redirect("/login?reason=no-assignment");
  redirect(`/room/${me.next_assignment.room_id}`);
}
