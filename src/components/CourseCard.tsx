import { CircleCheck, Info } from "lucide-react";
import { formatClock, formatDuration, shortTime } from "@/lib/time";
import type { CourseState } from "@/lib/types";
import { SEAT_THEME, STATUS_STYLE } from "./seat-theme";

function durationLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h && `${h} Hour${h > 1 ? "s" : ""}`, m && `${m} Min`].filter(Boolean).join(" ");
}

export function CourseCard({
  state,
  now,
  completedAt,
  onToggleComplete,
  seatLabel,
}: {
  state: CourseState;
  now: number;
  /** ISO time ที่ยืนยันสอบเสร็จ (null = ยังไม่เสร็จ) */
  completedAt: string | null;
  onToggleComplete: () => void;
  /** ช่วงเลขที่นั่งจากผังห้อง เช่น "Seats A1 – A80" (แทนช่วงรหัสนักศึกษา) */
  seatLabel: string;
}) {
  const { course, status, remainingMs, startAt } = state;
  const seat = SEAT_THEME[course.seat_color_theme] ?? SEAT_THEME.white;
  const style = STATUS_STYLE[status];

  return (
    <article
      className={`rounded-3xl px-6 py-[2vh] lg:px-8 bg-white border shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] transition-all duration-500 ${style.card}`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4 lg:gap-5 min-w-0">
          <div
            className={`h-[clamp(2.5rem,7vh,4rem)] w-[clamp(2.5rem,7vh,4rem)] rounded-2xl border flex items-center justify-center font-bold text-[clamp(1.1rem,3.2vh,1.6rem)] flex-shrink-0 shadow-sm ${seat.badge}`}
          >
            {course.row_label}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs lg:text-sm font-semibold text-slate-400 font-num">
                {shortTime(course.start_time)} - {shortTime(course.end_time)}
              </span>
              <span className="text-[10px] lg:text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                Sec {course.section}
              </span>
              <span className={`text-[10px] lg:text-xs px-2 py-0.5 rounded-full border font-medium ${seat.pill}`}>
                {durationLabel(course.duration_minutes)}
              </span>
            </div>
            <h2 className="text-[clamp(1.1rem,3.4vh,1.9rem)] font-semibold tracking-tight text-slate-900 mt-[0.4vh] truncate">
              <span className="font-bold font-num text-slate-950 mr-2">{course.course_code}</span>
              {course.course_name}
            </h2>
            <p className={`mt-1 text-sm font-semibold lg:text-base ${seat.text}`}>{seatLabel}</p>
          </div>
        </div>

        <div className="flex flex-wrap md:flex-col items-center md:items-end justify-between gap-x-3 border-t md:border-0 border-slate-50 pt-3 md:pt-0 flex-shrink-0">
          <span className="text-[11px] lg:text-xs font-semibold text-slate-400 tracking-wider uppercase">
            {style.label}
          </span>
          {status === "ended" ? (
            <span className="font-num text-[clamp(1.5rem,5vh,2.5rem)] font-bold tracking-tight text-rose-500">ENDED</span>
          ) : (
            <span className={`font-num text-[clamp(1.75rem,6.5vh,3.25rem)] font-semibold tracking-tight ${style.timer}`}>
              {formatDuration(status === "upcoming" ? startAt - now : remainingMs)}
            </span>
          )}
          {/* ปุ่มยืนยันสอบเสร็จอยู่ใต้เวลา — ไม่เพิ่มแถว (ให้พอดีจอ 4:3) */}
          {completedAt ? (
            <div className="mt-[0.6vh] flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                <CircleCheck className="h-4 w-4" /> Completed · <span className="font-num">{formatClock(Date.parse(completedAt)).slice(0, 5)}</span>
              </span>
              <button onClick={onToggleComplete} className="text-xs text-slate-400 underline hover:text-slate-700">
                Undo
              </button>
            </div>
          ) : (
            <button
              onClick={onToggleComplete}
              className={`mt-[0.6vh] inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                status === "ended"
                  ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <CircleCheck className="h-4 w-4" /> Mark as completed
            </button>
          )}
        </div>
      </div>

      {/* ข้อกำหนดเพิ่มเติมจาก Admin (แสดงเมื่อมี) */}
      {course.admin_note && (
        <p className="mt-[1.2vh] flex min-w-0 items-start gap-2 rounded-xl bg-amber-50 px-3 py-[0.8vh] text-[clamp(0.85rem,2.1vh,1.1rem)] text-amber-900">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
          <span>
            <span className="font-semibold">Exam Office note: </span>
            {course.admin_note}
          </span>
        </p>
      )}
    </article>
  );
}
