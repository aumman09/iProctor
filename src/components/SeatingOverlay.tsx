"use client";

import { X } from "lucide-react";
import type { ProctorNote } from "@/hooks/useProctorNotes";
import type { RoomLayoutResponse, RoomPhase, RoomSchedule } from "@/lib/types";
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
      return c ? { ...g, courseName: c.course_name, studentIdRange: c.student_id_range || undefined } : g;
    }),
  };
  // ไม่มีแถบเลื่อน: ทุกอย่างต้องพอดีจอเดียว — จอแนวนอน (โปรเจกเตอร์) วางนาฬิกาด้านซ้าย ผังด้านขวาใช้ความสูงเต็มจอ
  // (SeatingChart large ย่อตามพื้นที่ที่เหลือจริง; นาฬิกาย่อตามความกว้างคอลัมน์ด้วย cqw)
  return (
    <div className="fixed inset-0 z-30 overflow-hidden bg-slate-50 p-4 md:p-6">
      <div className="grid h-full grid-rows-[auto_minmax(0,1fr)] gap-4 landscape:grid-cols-[minmax(15rem,1fr)_minmax(0,2.8fr)] landscape:grid-rows-1 landscape:gap-6">
        <div className="flex min-h-0 flex-col justify-center gap-4" style={{ containerType: "inline-size" }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-950 lg:text-3xl">ผังที่นั่งห้องสอบ {layout.roomId}</h2>
              <p className="text-slate-500">กรุณานั่งตามแถวและสีป้ายที่กำหนด (Please take your assigned seat)</p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 px-4 py-2 rounded-full bg-slate-950 text-white text-sm font-medium inline-flex items-center gap-1.5"
            >
              <X className="w-4 h-4" /> {autoMode ? "ไปหน้านาฬิกา" : "ปิด"}
            </button>
          </div>
          <OfficialClock now={now} schedule={schedule} phase={phase} compact />
          <NoteBoard note={note} compact />
        </div>
        <SeatingChart layout={layout} large />
      </div>
    </div>
  );
}
