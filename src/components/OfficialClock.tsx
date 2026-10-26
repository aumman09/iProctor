
import { PHASE_LABEL } from "@/lib/schedule-engine";
import { formatClock, shortTime } from "@/lib/time";
import type { RoomPhase, RoomSchedule } from "@/lib/types";

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function OfficialClock({
  now,
  schedule,
  phase,
  compact = false,
  shrink = false,
}: {
  now: number;
  schedule: RoomSchedule;
  phase: RoomPhase;
  compact?: boolean;
  /** มีประกาศบนจอ → ย่อนาฬิกาให้ทุกอย่างพอดีจอ 4:3 */
  shrink?: boolean;
}) {
  const label = PHASE_LABEL[phase];
  return (
    <section className="text-center my-[1vh]">
      <span className="text-[10px] lg:text-xs font-bold tracking-[0.25em] text-slate-600 uppercase">
        MFU Official Standard Time
      </span>
      <div className={`font-num leading-none ${compact ? "text-[clamp(2.5rem,19cqw,6rem)] my-2" : shrink ? "text-[clamp(3rem,min(11vh,10vw),8rem)] my-[0.4vh]" : "text-[clamp(3.5rem,min(17vh,15vw),11rem)] my-[0.6vh]"} font-normal tracking-tight text-slate-950`}>
        {formatClock(now)}
      </div>
      <div className="text-xs lg:text-sm text-slate-600 font-medium">
        {formatDate(schedule.date)} • {shortTime(schedule.session_start)} - {shortTime(schedule.session_end)}
      </div>
      <div className="mt-[1vh] inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100/80 text-slate-600 text-sm lg:text-base font-medium">
        {label.en}
      </div>
    </section>
  );
}
