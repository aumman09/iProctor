import { formatDuration, shortTime } from "@/lib/time";
import type { CourseState } from "@/lib/types";
import { SEAT_THEME, STATUS_STYLE } from "./seat-theme";

function durationLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h && `${h} Hour${h > 1 ? "s" : ""}`, m && `${m} Min`].filter(Boolean).join(" ");
}

export function CourseCard({ state, now }: { state: CourseState; now: number }) {
  const { course, status, remainingMs, startAt } = state;
  const seat = SEAT_THEME[course.seat_color_theme] ?? SEAT_THEME.white;
  const style = STATUS_STYLE[status];

  return (
    <article
      className={`rounded-3xl p-6 lg:p-8 bg-white border shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] transition-all duration-500 ${style.card}`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4 lg:gap-5 min-w-0">
          <div
            className={`w-12 h-12 lg:w-16 lg:h-16 rounded-2xl border flex items-center justify-center font-bold text-lg lg:text-2xl flex-shrink-0 shadow-sm ${seat.badge}`}
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
            <h2 className="text-xl lg:text-3xl font-semibold tracking-tight text-slate-900 mt-1 truncate">
              <span className="text-slate-400 font-normal font-num mr-2">{course.course_code}</span>
              {course.course_name}
            </h2>
            <p className="text-xs lg:text-sm font-mono text-slate-500 mt-1">
              ID: {course.student_id_range}
              <span className="text-slate-300 font-sans mx-1.5">•</span>
              <span className={`font-medium font-sans ${seat.text}`}>{course.seat_description}</span>
            </p>
          </div>
        </div>

        <div className="flex md:flex-col items-baseline md:items-end justify-between border-t md:border-0 border-slate-50 pt-3 md:pt-0 flex-shrink-0">
          <span className="text-[11px] lg:text-xs font-semibold text-slate-400 tracking-wider uppercase">
            {style.label}
          </span>
          {status === "ended" ? (
            <span className="font-num text-2xl lg:text-4xl font-bold tracking-tight text-rose-500">ENDED</span>
          ) : (
            <span className={`font-num text-3xl lg:text-5xl font-semibold tracking-tight ${style.timer}`}>
              {formatDuration(status === "upcoming" ? startAt - now : remainingMs)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
