"use client";

import { X } from "lucide-react";
import type { RoomLayoutResponse, RoomPhase, RoomSchedule } from "@/lib/types";
import { OfficialClock } from "./OfficialClock";
import { SeatingChart } from "./SeatingChart";

/** ผังที่นั่งเต็มจอ (Pre-Exam Mode / กดเปิดเอง) */
interface Props {
  layout: RoomLayoutResponse;
  onClose: () => void;
  autoMode: boolean;
  now: number;
  schedule: RoomSchedule;
  phase: RoomPhase;
}

export function SeatingOverlay({ layout, onClose, autoMode, now, schedule, phase }: Props) {
  return (
    <div className="fixed inset-0 z-30 bg-slate-50 overflow-auto p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-950">ผังที่นั่งห้องสอบ {layout.roomId}</h2>
            <p className="text-slate-500">กรุณานั่งตามแถวและสีป้ายที่กำหนด (Please take your assigned seat)</p>
          </div>
          <button onClick={onClose} className="px-4 py-2 rounded-full bg-slate-950 text-white text-sm font-medium inline-flex items-center gap-1.5">
            <X className="w-4 h-4" /> {autoMode ? "ไปหน้านาฬิกา" : "ปิด"}
          </button>
        </div>
        <OfficialClock now={now} schedule={schedule} phase={phase} compact />
        <div className="mt-4">
          <SeatingChart layout={layout} large />
        </div>
      </div>
    </div>
  );
}

