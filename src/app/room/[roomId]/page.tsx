import { RoomScreen } from "@/components/RoomScreen";
import type { SessionName } from "@/lib/types";

// หน้าจอฉายโปรเจกเตอร์ของห้องสอบ
// ตัวอย่าง: /room/C3-107?session=afternoon&sim=13:14:50  (โหมดจำลองเวลาเพื่อซ้อม/ทดสอบ)
export default async function RoomPage(props: PageProps<"/room/[roomId]">) {
  const { roomId } = await props.params;
  const sp = await props.searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const session = one(sp.session);
  const speed = Number(one(sp.speed));

  return (
    <RoomScreen
      key={JSON.stringify(sp)}
      roomId={decodeURIComponent(roomId)}
      date={one(sp.date)}
      session={session === "morning" || session === "afternoon" ? (session as SessionName) : undefined}
      sim={one(sp.sim)}
      speed={Number.isFinite(speed) && speed > 0 ? speed : undefined}
    />
  );
}
