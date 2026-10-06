import { SESSIONS } from "@/lib/config";
import { PHASE_LABEL } from "@/lib/schedule-engine";
import { formatClock, shortTime } from "@/lib/time";
import type { RoomPhase, RoomSchedule } from "@/lib/types";

export function OfficialClock({ now, schedule, phase, compact = false }: { now: number; schedule: RoomSchedule; phase: RoomPhase; compact?: boolean }) {
  const label = PHASE_LABEL[phase];
  return (
    <section className="text-center my-3">
      <span className="text-[10px] lg:text-xs font-bold tracking-[0.25em] text-slate-400 uppercase">
        MFU Official Standard Time
      </span>
      <div className={`font-num leading-none ${compact ? "text-6xl md:text-8xl" : "text-7xl md:text-9xl lg:text-[11rem]"} font-extralight tracking-tight text-slate-950 my-2`}>
        {formatClock(now)}
      </div>
      <div className="text-xs lg:text-sm text-slate-400 font-medium">
        {SESSIONS[schedule.session].label} • {shortTime(schedule.session_start)} - {shortTime(schedule.session_end)}
      </div>
      <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100/80 text-slate-600 text-sm lg:text-base font-medium">
        {label.th}
        <span className="text-slate-400 text-xs lg:text-sm">· {label.en}</span>
      </div>
    </section>
  );
}
