import { Fragment } from "react";
import { DoorOpen, Projector } from "lucide-react";
import type { RoomLayoutResponse, SeatColorTheme } from "@/lib/types";
import { SEAT_THEME } from "./seat-theme";

const SEAT_FILL: Record<SeatColorTheme, string> = {
  pink: "bg-rose-50 text-rose-700 ring-rose-200",
  white: "bg-white text-slate-700 ring-slate-300",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  yellow: "bg-amber-50 text-amber-700 ring-amber-200",
};

const groupOf = (seat: string) => seat.match(/^[A-Za-z]+/)?.[0] ?? "";
const numberOf = (seat: string) => Number(seat.slice(groupOf(seat).length));

/** ผังที่นั่งตามผังจริงของห้อง: แถวนับจากหน้าห้อง × กลุ่มโต๊ะซ้าย→ขวา (FR-03) */
export function SeatingChart({ layout, large = false }: { layout: RoomLayoutResponse; large?: boolean }) {
  const groups = new Map(layout.groups.map((g) => [g.key, g]));
  const disabled = new Set(layout.disabledSeats ?? []);
  const doors = new Set(layout.doorPositions);
  const blockCount = Math.max(...layout.rows.map((r) => r.blocks.length));
  const text = large ? "text-sm" : "text-[11px]";
  const seatSize = large ? "h-8 min-w-11 text-sm" : "h-7 min-w-9 text-[11px]";

  const seatsByGroup = new Map<string, number[]>();
  for (const row of layout.rows)
    for (const seat of row.blocks.flat())
      if (seat) seatsByGroup.set(groupOf(seat), [...(seatsByGroup.get(groupOf(seat)) ?? []), numberOf(seat)]);

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 md:p-6">
      {layout.title && (
        <h3 className={`text-center font-semibold text-slate-900 mb-4 ${large ? "text-xl" : "text-base"}`}>{layout.title}</h3>
      )}

      <div className="overflow-x-auto">
        <div className={large ? "" : "min-w-[36rem]"}>
          <div className="flex items-center gap-3 mb-4">
            <Door show={doors.has("FRONT_LEFT")} text={text} />
            <div className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 py-1.5 font-medium text-slate-500 ${text}`}>
              <Projector className="w-4 h-4" /> ไวท์บอร์ด · โปรเจกเตอร์ (หน้าห้อง)
            </div>
            <Door show={doors.has("FRONT_RIGHT")} text={text} />
          </div>

          <div
            className="grid items-center gap-x-4 gap-y-1.5"
            style={{ gridTemplateColumns: `auto repeat(${blockCount}, minmax(0, 1fr)) auto` }}
          >
            {layout.rows.map((row) => {
              const keys = new Set(row.blocks.flat().filter((s): s is string => !!s).map(groupOf));
              const only = keys.size === 1 ? groups.get([...keys][0]) : undefined;
              const label = (
                <div className={`flex items-center gap-1.5 whitespace-nowrap font-medium text-slate-400 ${text}`}>
                  {only && <span className={`h-2 w-2 rounded-full ${SEAT_THEME[only.colorTheme].dot}`} />}
                  {row.label}
                </div>
              );
              return (
                <Fragment key={row.label}>
                  {label}
                  {Array.from({ length: blockCount }, (_, b) => {
                    const block = row.blocks[b];
                    if (!block) return <div key={b} />;
                    return (
                      <div
                        key={b}
                        className={`flex items-center gap-1 rounded-lg bg-slate-100/70 p-1 ${block.length === 1 ? "justify-center" : "justify-between"}`}
                      >
                        {block.map((seat, i) => {
                          if (!seat) return <span key={i} className="h-1.5 w-1.5 rounded-full bg-slate-300" />;
                          const group = groups.get(groupOf(seat));
                          const off = disabled.has(seat);
                          return (
                            <div
                              key={seat}
                              title={off ? `${seat} · งดใช้` : `${seat} · ${group?.courseName ?? ""}`}
                              className={`flex items-center justify-center rounded-md px-1 font-semibold font-num ring-1 ${seatSize} ${
                                off ? "bg-slate-50 text-slate-300 ring-slate-200 line-through" : SEAT_FILL[group?.colorTheme ?? "white"]
                              }`}
                            >
                              {seat}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                  {label}
                </Fragment>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-3 border-t border-dashed border-slate-200 pt-3">
            <Door show={doors.has("BACK_LEFT")} text={text} />
            <span className={`flex-1 text-center text-slate-400 ${text}`}>ด้านหลังห้อง</span>
            <Door show={doors.has("BACK_RIGHT")} text={text} />
          </div>
        </div>
      </div>

      <ul className={`mt-5 grid gap-2 border-t border-slate-100 pt-4 text-slate-600 ${large ? "text-sm sm:grid-cols-2" : "text-xs"}`}>
        {layout.groups.map((g) => {
          const nums = seatsByGroup.get(g.key) ?? [];
          return (
            <li key={g.key} className="flex items-start gap-2">
              <span className={`mt-1 h-3 w-3 flex-shrink-0 rounded ${SEAT_THEME[g.colorTheme].dot}`} />
              <span>
                <span className="font-semibold text-slate-900 font-num">
                  {g.key}
                  {Math.min(...nums)}–{g.key}
                  {Math.max(...nums)}
                </span>{" "}
                · {g.courseName} · <span className="text-slate-400">รหัส</span> <span className="font-num">{g.studentIdRange}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Door({ show, text }: { show: boolean; text: string }) {
  if (!show) return <span className="w-16" />;
  return (
    <span className={`inline-flex w-16 items-center justify-center gap-1 rounded-md border border-slate-200 py-1 text-slate-500 ${text}`}>
      <DoorOpen className="w-3.5 h-3.5" /> ประตู
    </span>
  );
}
