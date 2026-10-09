import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { SeatingChart } from "@/components/SeatingChart";
import { getRoomLayout } from "@/lib/server/data-source";
import { logUsage } from "@/lib/server/usage";
import { SiteFooter } from "@/components/SiteFooter";

// หน้าผังที่นั่งสำหรับนักศึกษา — สาธารณะ ไม่ต้อง login
export default async function SeatingPage(props: PageProps<"/seating/[roomId]">) {
  const { roomId } = await props.params;
  const layout = await getRoomLayout(decodeURIComponent(roomId));
  if (!layout) notFound();
  await logUsage("SEATING_VIEW", { roomId: layout.roomId });

  return (
    <div className="flex min-h-screen flex-col">
      <main className="max-w-4xl mx-auto w-full flex-1 p-4">
        <div className="mb-3">
          <BackButton />
        </div>
        <h1 className="text-lg font-bold text-slate-950 mb-4">
          ผังที่นั่งห้องสอบ <span className="text-rose-600">{layout.roomId}</span>
        </h1>
        <SeatingChart layout={layout} />
      </main>
      <SiteFooter />
    </div>
  );
}
