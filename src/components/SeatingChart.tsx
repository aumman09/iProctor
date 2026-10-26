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

/**
 * ขนาดตัวเลขที่นั่ง (pt) — ใหญ่ที่สุดที่ยังอยู่ในโต๊ะ/เก้าอี้ที่ตัวเลขนั้นวางอยู่ (ไม่ทับกัน)
 * ตัวเลขใหญ่ขึ้นได้ถึง 1.6 เท่าของต้นฉบับ แต่ไม่เล็กกว่าต้นฉบับ
 */
function fitLabelPt(layout: RoomLayoutResponse): number {
  const base = layout.labelSize ?? 8;
  let fit = base * 1.6;
  const boxes = [...(layout.desks ?? []), ...(layout.chairs ?? [])];
  for (const b of boxes) {
    const inside = layout.seats.filter((s) => s.x >= b.x && s.x <= b.x + b.w && s.y >= b.y && s.y <= b.y + b.h);
    if (!inside.length) continue;
    const chars = Math.max(...inside.map((s) => s.id.length));
    // ตัวเลขหนาประมาณ 0.62em ต่อหลัก; หลายเลขในโต๊ะเดียวแบ่งพื้นที่กัน (เรียงแนวนอน หรือซ้อนแนวตั้ง)
    const ys = inside.map((s) => s.y);
    const sideBySide = Math.max(...ys) - Math.min(...ys) < b.h * 0.25;
    const n = inside.length;
    fit = Math.min(fit, (sideBySide ? b.w / n : b.w) / (chars * 0.62), (sideBySide ? b.h : b.h / n) * 0.9);
  }
  return Math.max(base, fit);
}

/**
 * ผังที่นั่งตามแบบผังจริงของสำนักทะเบียน (โต๊ะ/เก้าอี้/ประตูตามตำแหน่งจริง) (FR-03)
 * หน้าห้อง (ไวท์บอร์ด/โปรเจกเตอร์) อยู่ด้านบนเสมอ — เหมือนนักศึกษาเดินเข้าห้องแล้วเห็นจอข้างหน้า
 */
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
  const labelPt = fitLabelPt(layout);
  const labelCqw = (labelPt / w) * 100;
  // ป้ายแถวอาจอยู่นอกผนัง → เผื่อขอบซ้าย/ขวาให้พอ (k = ส่วนที่ล้น / ความกว้างห้อง)
  const overflow = Math.max(
    0,
    ...(layout.rowLabels ?? []).map((r) => Math.max(-r.x, r.x - w) + r.label.length * labelPt * 0.35),
  );
  const k = overflow / w;
  const sidePad = k > 0 ? `${((k / (1 + 2 * k)) * 100).toFixed(2)}%` : "1rem";

  return (
    <div
      className={`w-full rounded-2xl border border-slate-200 bg-white ${large ? "flex h-full min-h-0 flex-col p-4" : "p-4 md:p-6"}`}
    >
      {layout.title && !large && <h3 className="text-center text-base font-semibold text-slate-900 mb-3">{layout.title}</h3>}

      {/*
        ห้ามมีแถบเลื่อน: ผังทั้งห้องต้องอยู่ในจอเดียว (ฉายให้นักศึกษาดูก่อนสอบ) — ย่อให้พอดีทั้งกว้างและสูง
        large: วัดพื้นที่ที่เหลือจริงด้วย container query (cqw/cqh) · หน้าเว็บ: ใช้ความสูงจอหักหัวเรื่อง (~240px)
        2.25rem = ป้าย "หน้าห้อง" เหนือกรอบห้อง
      */}
      <div className={large ? "min-h-0 flex-1 py-4" : "py-4"} style={large ? { containerType: "size" } : undefined}>
        <div
          className="mx-auto"
          style={{
            paddingInline: sidePad,
            width: large
              ? `min(100cqw, calc((100cqh - 2.25rem) * ${((w / h) * (1 + 2 * k)).toFixed(3)}))`
              : `min(100%, calc((100vh - 240px) * ${((w / h) * (1 + 2 * k)).toFixed(3)}))`,
          }}
        >
          <div className={`mb-2 flex items-center justify-center gap-1.5 font-medium text-slate-700 ${text}`}>
            <Projector className="w-4 h-4" /> Front of Room (projector / whiteboard)
          </div>

          <div
            className="relative rounded-md border-[3px] border-slate-300 bg-slate-50/60"
            style={{ aspectRatio: `${w} / ${h}`, containerType: "inline-size" }}
          >
            {layout.whiteboard && (
              <div className="absolute rounded-sm bg-slate-400" style={pos(layout.whiteboard)} title="Whiteboard" />
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
                  title={c.seat ? (off ? `${c.seat} · not in use` : c.seat) : "Do Not Seat"}
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
                    off ? "text-slate-500 line-through" : LABEL_TEXT[g?.colorTheme ?? "white"]
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
                className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-medium leading-none text-slate-600"
                style={{ left: `${(r.x / w) * 100}%`, top: `${(r.y / h) * 100}%`, fontSize: `${labelCqw}cqw` }}
              >
                {r.label}
              </span>
            ))}

            {layout.doors.map((d, i) => (
              <span
                key={`door${i}`}
                style={DOOR_POS[d.wall](d.at)}
                title="Door"
                aria-label="Door"
                className="absolute inline-flex items-center justify-center rounded-md border border-slate-300 bg-white p-1 text-slate-700 shadow-sm"
              >
                <DoorOpen className={large ? "w-5 h-5" : "w-4 h-4"} />
              </span>
            ))}
          </div>
        </div>
      </div>

      <ul
        className={`border-t border-slate-100 text-slate-600 ${
          large ? "flex shrink-0 flex-wrap justify-center gap-x-6 gap-y-1 pt-3 text-base" : "mt-4 grid gap-2 pt-4 text-xs"
        }`}
      >
        {layout.groups.map((g) => {
          const nums = layout.seats.filter((s) => s.group === g.key).map((s) => numberOf(s.id));
          return (
            <li key={g.key} className="flex items-start gap-2">
              <span className={`mt-1 h-3 w-3 flex-shrink-0 rounded ${SEAT_THEME[g.colorTheme].dot}`} />
              <span>
                <span className="font-semibold text-slate-900 font-num">
                  Seat {g.key}
                  {Math.min(...nums)}–{g.key}
                  {Math.max(...nums)}
                </span>
                <span className="text-slate-600"> · {nums.length} seats</span>
                {g.courseName && <> · {g.courseName}</>}
                {g.studentIdRange && (
                  <>
                    {" "}
                    · <span className="text-slate-600">ID</span> <span className="font-num">{g.studentIdRange}</span>
                  </>
                )}
              </span>
            </li>
          );
        })}
        {layout.chairs?.some((c) => !c.seat) && (
          <li className="flex items-center gap-2 text-slate-600">
            <span className="h-3 w-3 flex-shrink-0 rounded border border-dashed border-slate-400" /> Do Not Seat
          </li>
        )}
        {layout.doors.length > 0 && (
          <li className="flex items-center gap-2 text-slate-600">
            <DoorOpen className="h-3.5 w-3.5 flex-shrink-0" /> Door
          </li>
        )}
      </ul>
    </div>
  );
}
