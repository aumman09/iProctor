"use client";

import { Maximize, Presentation, Volume2, VolumeX } from "lucide-react";
import { formatClock } from "@/lib/time";
import type { ExamEvent, RoomSchedule } from "@/lib/types";

const EVENT_LABEL: Record<ExamEvent["type"], string> = {
  ROOM_OPEN: "เปิดห้อง",
  EXAM_START: "เริ่มสอบ",
  DEPARTURE_ALLOWED: "ครบ 45 นาที",
  COURSE_WARNING: "เตือน 10 นาที",
  COURSE_END: "หมดเวลา",
  SESSION_END: "จบรอบสอบ",
};

const pill = "px-3.5 py-1.5 rounded-full border shadow-sm transition font-medium inline-flex items-center gap-1.5";
const btn = `${pill} bg-white hover:bg-slate-50 border-slate-200/80`;

interface Props {
  version: string;
  synced: boolean;
  offsetMs: number;
  muted: boolean;
  onToggleMute: () => void;
  onTestSound: () => void;
  onShowSlides: () => void;
  sim: null | {
    schedule: RoomSchedule;
    timeline: ExamEvent[];
    speed: number;
    onJump: (at: number) => void;
    onSpeed: (speed: number) => void;
  };
}

export function ControlBar(p: Props) {
  return (
    <footer className="max-w-5xl mx-auto w-full px-6 py-6 flex flex-col gap-3 text-xs text-slate-400">
      {p.sim && <SimControls {...p.sim} />}

      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${p.synced ? "bg-emerald-500" : "bg-amber-500"}`} />
          <span className="font-medium text-slate-600">
            iProctor {p.version} • {p.synced ? "MFU Time Synced" : "Local Clock"}
          </span>
          {p.synced && <span className="font-num">(offset {(p.offsetMs / 1000).toFixed(2)}s)</span>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={p.onShowSlides} className={`${btn} text-slate-600`}>
            <Presentation className="w-3.5 h-3.5" /> ระเบียบการสอบ
          </button>
          <button onClick={p.onTestSound} className={`${btn} text-slate-600`}>
            <Volume2 className="w-3.5 h-3.5" /> ทดสอบเสียง
          </button>
          <button onClick={p.onToggleMute} className={`${btn} ${p.muted ? "text-rose-600" : "text-slate-600"}`}>
            {p.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            {p.muted ? "ปิดเสียงอยู่" : "เสียงเปิด"}
          </button>
          <button
            onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())}
            className="px-4 py-1.5 rounded-full bg-slate-950 hover:bg-slate-800 text-white shadow-sm transition font-medium inline-flex items-center gap-1.5"
          >
            <Maximize className="w-3.5 h-3.5" /> ฉายเต็มจอ
          </button>
        </div>
      </div>
    </footer>
  );
}

function SimControls({ schedule, timeline, speed, onJump, onSpeed }: NonNullable<Props["sim"]>) {
  const rowOf = (courseId?: string) => schedule.courses.find((c) => c.course_id === courseId)?.row_label;
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40">
      <span className="font-semibold text-indigo-600 mr-1">โหมดจำลอง</span>
      {timeline.map((ev) => (
        <button key={ev.id} onClick={() => onJump(ev.at - 5000)} className={`${btn} text-indigo-600`}>
          → {EVENT_LABEL[ev.type]}
          {ev.courseId && ` (${rowOf(ev.courseId)})`}
          <span className="font-num text-slate-400">{formatClock(ev.at).slice(0, 5)}</span>
        </button>
      ))}
      <span className="mx-1 text-slate-300">|</span>
      {[1, 10, 60].map((s) => (
        <button key={s} onClick={() => onSpeed(s)} className={s === speed ? `${pill} text-white bg-indigo-600 border-indigo-600` : `${btn} text-indigo-600`}>
          x{s}
        </button>
      ))}
    </div>
  );
}
