import Link from "next/link";
import { LayoutGrid, MonitorPlay, Search } from "lucide-react";
import { PageHeader } from "@/components/admin/ui";
import { SEAT_THEME } from "@/components/seat-theme";
import { listRoomsWithLayouts } from "@/lib/server/admin";

const FRONT: Record<string, string> = { TOP: "top", BOTTOM: "bottom", LEFT: "left", RIGHT: "right" };

export default async function AdminRooms(props: PageProps<"/admin/rooms">) {
  const sp = await props.searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().toUpperCase().replace(/[\s-]/g, "") ?? "";
  const building = Array.isArray(sp.b) ? sp.b[0] : sp.b;
  const all = await listRoomsWithLayouts();
  const buildings = [...new Set(all.map((r) => r.building))];
  const list = all.filter((r) => (!building || r.building === building) && (!q || r.id.replace("-", "").includes(q)));

  return (
    <>
      <PageHeader
        title="Exam rooms"
        sub={`${all.length} rooms · ${buildings.length} buildings — layouts from the Registrar's PDFs · use “Demo screen” to test the exam screen with a room's layout`}
      />

      <form method="get" className="mb-6 flex flex-wrap items-center gap-2">
        <Link
          href="/admin/rooms"
          className={`rounded-full px-3 py-1.5 text-sm ${!building ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
        >
          All
        </Link>
        {buildings.map((b) => (
          <Link
            key={b}
            href={`/admin/rooms?b=${b}`}
            className={`rounded-full px-3 py-1.5 text-sm ${building === b ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            {b}
          </Link>
        ))}
        <div className="relative ml-auto min-w-48">
          {building && <input type="hidden" name="b" value={building} />}
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input name="q" defaultValue={q} placeholder="Search room" className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm" />
        </div>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((r) => (
          <article key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-lg font-bold text-slate-900">
                  {r.building} {r.roomNumber}
                </p>
                <p className="text-xs text-slate-500">
                  {r.capacity} seats · whiteboard {FRONT[r.layout.source?.front ?? "TOP"]} · {r.layout.doors.length} doors · v{r.version}
                </p>
              </div>
              <div className="flex gap-1">
                {r.layout.groups.map((g) => (
                  <span key={g.key} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-1.5 py-0.5 text-xs text-slate-600">
                    <span className={`h-2 w-2 rounded-full ${SEAT_THEME[g.colorTheme].dot}`} />
                    {g.key || "Numbers"}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link
                href={`/seating/${r.id}`}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <LayoutGrid className="h-4 w-4 text-slate-400" /> Seating
              </Link>
              <Link
                href={`/room/${r.id}?session=afternoon&sim=13:14:45&speed=1&demo=1`}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                <MonitorPlay className="h-4 w-4" /> Demo screen
              </Link>
            </div>
          </article>
        ))}
      </div>
      {list.length === 0 && <p className="py-10 text-center text-sm text-slate-400">No rooms found</p>}
    </>
  );
}
