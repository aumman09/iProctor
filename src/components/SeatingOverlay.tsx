"use client";

import { X } from "lucide-react";
import type { ProctorNote } from "@/hooks/useProctorNotes";
import type { RoomLayoutResponse, RoomPhase, RoomSchedule } from "@/lib/types";
import { PHASE_LABEL } from "@/lib/schedule-engine";
import { formatClock } from "@/lib/time";
import { OfficialClock } from "./OfficialClock";
import { NoteBoard } from "./ProctorNotes";
import { SeatingChart } from "./SeatingChart";

/** ผังที่นั่งเต็มจอ (Pre-Exam Mode / กดเปิดเอง) */
interface Props {
  layout: RoomLayoutResponse;
  onClose: () => void;
  autoMode: boolean;
  now: number;
  schedule: RoomSchedule;
  phase: RoomPhase;
  note: ProctorNote;
}

export function SeatingOverlay({ layout: base, onClose, autoMode, now, schedule, phase, note }: Props) {
  // ผังจาก PDF ไม่มีชื่อวิชา → ใส่ชื่อวิชา/ช่วงรหัสของรอบนี้ลงกลุ่มที่นั่ง (A/B) สำหรับคำอธิบายใต้ผัง
  const layout = {
    ...base,
    groups: base.groups.map((g) => {
      const c = schedule.courses.find((x) => x.row_label === g.key);
      return c ? { ...g, courseName: `${c.course_code} ${c.course_name}` } : g;
    }),
  };
  // ไม่มีแถบเลื่อน: ทุกอย่างต้องพอดีจอเดียว (SeatingChart large ย่อตามพื้นที่ที่เหลือจริง)
  // จอกว้าง (≥ 3:2): นาฬิกาด้านซ้าย ผังด้านขวาเต็มความสูง · จอ 4:3/แนวตั้ง: แถบชื่อห้อง+เวลาด้านบน ผังเต็มความกว้าง
  const closeButton = (
    <button
      onClick={onClose}
      className="flex-shrink-0 px-4 py-2 rounded-full bg-slate-950 text-white text-sm font-medium inline-flex items-center gap-1.5"
    >
      <X className="w-4 h-4" /> {autoMode ? "Go to clock" : "Close"}
    </button>
  );
  const title = (
    <div className="min-w-0">
      <h2 className="text-[clamp(1.25rem,3.6vh,1.875rem)] font-extrabold text-slate-950">Seating · {layout.roomId}</h2>
      <p className="text-[clamp(0.8rem,2vh,1rem)] text-slate-700">Please take your assigned seat according to your seat number and sign colour.</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-30 overflow-hidden bg-slate-50 p-[2vh] md:px-6">
      <div className="grid h-full grid-rows-[auto_minmax(0,1fr)] gap-[1.5vh] [@media(min-aspect-ratio:3/2)]:grid-cols-[minmax(15rem,1fr)_minmax(0,2.8fr)] [@media(min-aspect-ratio:3/2)]:grid-rows-1 [@media(min-aspect-ratio:3/2)]:gap-6">
        {/* จอกว้าง: คอลัมน์ซ้าย */}
        <div className="hidden min-h-0 flex-col justify-center gap-4 [@media(min-aspect-ratio:3/2)]:flex" style={{ containerType: "inline-size" }}>
          <div className="flex items-start justify-between gap-3">
            {title}
            {closeButton}
          </div>
          <OfficialClock now={now} schedule={schedule} phase={phase} compact />
          <NoteBoard note={note} compact />
        </div>
        {/* จอ 4:3: แถบบน */}
        <div className="flex flex-col gap-[1vh] [@media(min-aspect-ratio:3/2)]:hidden">
          <div className="flex items-center justify-between gap-4">
            {title}
            <div className="flex flex-shrink-0 items-center gap-4">
              <div className="text-right">
                <p className="font-num text-[clamp(1.75rem,7vh,4rem)] font-extralight leading-none tracking-tight text-slate-950">{formatClock(now)}</p>
                <p className="mt-1 text-xs font-medium text-slate-600">{PHASE_LABEL[phase].en}</p>
              </div>
              {closeButton}
            </div>
          </div>
          <NoteBoard note={note} compact />
        </div>
        <SeatingChart layout={layout} large />
      </div>
    </div>
  );
}
