import type { CSSProperties } from "react";
import { DoorOpen, Projector } from "lucide-react";
import type { LayoutBox, RoomLayoutResponse, SeatColorTheme, Wall } from "@/lib/types";
import { SEAT_THEME } from "./seat-theme";

/** สีเก้าอี้ที่ใช้สอบ / สีตัวเลขที่นั่ง ตามป้ายกระดาษ */
const CHAIR_FILL: Record<SeatColorTheme, string> = {
  pink: "bg-rose-200 border-rose-400",
  white: "bg-white border-slate-400",
  blue: "bg-sky-200 border-sky-400",
  green: "bg-emerald-200 border-emerald-400",
  yellow: "bg-amber-200 border-amber-400",
};
const LABEL_TEXT: Record<SeatColorTheme, string> = {
  pink: "text-rose-600",
  white: "text-slate-800",
  blue: "text-sky-700",
  green: "text-emerald-700",
  yellow: "text-amber-700",
};

const numberOf = (id: string) => Number(id.replace(/^[A-Za-z]+/, ""));

const DOOR_POS: Record<Wall, (at: number) => CSSProperties> = {
  TOP: (at) => ({ top: 0, left: `${at * 100}%`, transform: "translate(-50%, -50%)" }),
  BOTTOM: (at) => ({ bottom: 0, left: `${at * 100}%`, transform: "translate(-50%, 50%)" }),
  LEFT: (at) => ({ left: 0, top: `${at * 100}%`, transform: "translate(-50%, -50%)" }),
  RIGHT: (at) => ({ right: 0, top: `${at * 100}%`, transform: "translate(50%, -50%)" }),
};

/** ผังที่นั่งตามแบบผังจริงของสำนักทะเบียน (โต๊ะ/เก้าอี้/ประตูตามตำแหน่งจริง) — หน้าห้องอยู่ด้านบนเสมอ (FR-03) */
export function SeatingChart({ layout, large = false }: { layout: RoomLayoutResponse; large?: boolean }) {
  const { w, h } = layout.size;
  const groups = new Map(layout.groups.map((g) => [g.key, g]));
  const seatGroup = new Map(layout.seats.map((s) => [s.id, groups.get(s.group)]));
  const disabled = new Set(layout.disabledSeats ?? []);
  const text = large ? "text-sm" : "text-xs";

  // ตำแหน่ง/ขนาดเป็น % ของห้อง; ตัวอักษรเป็น cqw (สัดส่วนความกว้างห้อง) ให้ย่อขยายตามจอ
  const pos = (b: LayoutBox): CSSProperties => ({
    left: `${(b.x / w) * 100}%`,
    top: `${(b.y / h) * 100}%`,
    width: `${(b.w / w) * 100}%`,
    height: `${(b.h / h) * 100}%`,
  });
  const labelPt = (layout.labelSize ?? 8) * 1.15;
  const labelCqw = (labelPt / w) * 100;
  // ตัวเลขต้องไม่เล็กกว่า ~11px → ความกว้างขั้นต่ำของห้องบนจอ (เกินจอแล้วเลื่อนแนวนอนได้)
  const minWidthPx = Math.round((11 * 100) / labelCqw);
  // ป้ายแถวอาจอยู่นอกผนัง → เผื่อขอบซ้าย/ขวาให้พอ (k = ส่วนที่ล้น / ความกว้างห้อง)
  const overflow = Math.max(
    0,
    ...(layout.rowLabels ?? []).map((r) => Math.max(-r.x, r.x - w) + r.label.length * labelPt * 0.35),
  );
  const k = overflow / w;
  const sidePad = k > 0 ? `${((k / (1 + 2 * k)) * 100).toFixed(2)}%` : "1rem";

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 md:p-6">
      {layout.title && (
        <h3 className={`text-center font-semibold text-slate-900 mb-3 ${large ? "text-xl" : "text-base"}`}>{layout.title}</h3>
      )}

      <div className="overflow-x-auto overflow-y-hidden py-4">
        <div
          className="mx-auto"
          style={{
            paddingInline: sidePad,
            // จอโปรเจกเตอร์: ใช้ความสูงที่เหลือใต้นาฬิกา (~360px) ให้ผังทั้งห้องอยู่ในจอเดียว
            width: large ? `min(100%, calc((100vh - 360px) * ${((w / h) * (1 + 2 * k)).toFixed(3)}))` : "100%",
            minWidth: large ? undefined : minWidthPx,
          }}
        >
          <div className={`mb-2 flex items-center justify-center gap-1.5 font-medium text-slate-500 ${text}`}>
            <Projector className="w-4 h-4" /> หน้าห้อง (ไวท์บอร์ด)
          </div>

          <div
            className="relative rounded-md border-[3px] border-slate-300 bg-slate-50/60"
            style={{ aspectRatio: `${w} / ${h}`, containerType: "inline-size" }}
          >
            {layout.whiteboard && (
              <div className="absolute rounded-sm bg-slate-400" style={pos(layout.whiteboard)} title="ไวท์บอร์ด" />
            )}

            {layout.desks?.map((d, i) => (
              <div key={`d${i}`} className="absolute rounded-[2px] border border-slate-300 bg-white" style={pos(d)} />
            ))}

            {layout.chairs?.map((c, i) => {
              const g = c.seat ? seatGroup.get(c.seat) : undefined;
              const off = c.seat && disabled.has(c.seat);
              return (
                <div
                  key={`c${i}`}
                  className={`absolute rounded-[30%] border ${
                    !c.seat || off ? "border-dashed border-slate-300" : CHAIR_FILL[g?.colorTheme ?? "white"]
                  }`}
                  style={pos(c)}
                  title={c.seat ? (off ? `${c.seat} · งดใช้` : c.seat) : "เก้าอี้ว่าง"}
                />
              );
            })}

            {layout.seats.map((s) => {
              const g = groups.get(s.group);
              const off = disabled.has(s.id);
              return (
                <span
                  key={s.id}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-bold leading-none font-num ${
                    off ? "text-slate-300 line-through" : LABEL_TEXT[g?.colorTheme ?? "white"]
                  }`}
                  style={{ left: `${(s.x / w) * 100}%`, top: `${(s.y / h) * 100}%`, fontSize: `${labelCqw}cqw` }}
                  title={g?.courseName ? `${s.id} · ${g.courseName}` : s.id}
                >
                  {s.id}
                </span>
              );
            })}

            {layout.rowLabels?.map((r) => (
              <span
                key={`${r.label}-${r.x}`}
                className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-medium leading-none text-slate-400"
                style={{ left: `${(r.x / w) * 100}%`, top: `${(r.y / h) * 100}%`, fontSize: `${labelCqw}cqw` }}
              >
                {r.label}
              </span>
            ))}

            {layout.doors.map((d, i) => (
              <span
                key={`door${i}`}
                style={DOOR_POS[d.wall](d.at)}
                title="ประตู"
                aria-label="ประตู"
                className="absolute inline-flex items-center justify-center rounded-md border border-slate-300 bg-white p-1 text-slate-500 shadow-sm"
              >
                <DoorOpen className={large ? "w-5 h-5" : "w-4 h-4"} />
              </span>
            ))}
          </div>
        </div>
      </div>

      <ul className={`mt-4 grid gap-2 border-t border-slate-100 pt-4 text-slate-600 ${large ? "text-sm sm:grid-cols-2" : "text-xs"}`}>
        {layout.groups.map((g) => {
          const nums = layout.seats.filter((s) => s.group === g.key).map((s) => numberOf(s.id));
          return (
            <li key={g.key} className="flex items-start gap-2">
              <span className={`mt-1 h-3 w-3 flex-shrink-0 rounded ${SEAT_THEME[g.colorTheme].dot}`} />
              <span>
                <span className="font-semibold text-slate-900 font-num">
                  {g.key}
                  {Math.min(...nums)}–{g.key}
                  {Math.max(...nums)}
                </span>
                <span className="text-slate-400"> · {nums.length} ที่นั่ง</span>
                {g.courseName && <> · {g.courseName}</>}
                {g.studentIdRange && (
                  <>
                    {" "}
                    · <span className="text-slate-400">รหัส</span> <span className="font-num">{g.studentIdRange}</span>
                  </>
                )}
              </span>
            </li>
          );
        })}
        {layout.chairs?.some((c) => !c.seat) && (
          <li className="flex items-center gap-2 text-slate-400">
            <span className="h-3 w-3 flex-shrink-0 rounded border border-dashed border-slate-400" /> เก้าอี้ว่าง (เว้นไว้)
          </li>
        )}
        {layout.doors.length > 0 && (
          <li className="flex items-center gap-2 text-slate-400">
            <DoorOpen className="h-3.5 w-3.5 flex-shrink-0" /> ประตู
          </li>
        )}
      </ul>
    </div>
  );
}
