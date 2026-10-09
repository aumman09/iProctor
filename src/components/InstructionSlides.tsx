"use client";

import { DoorClosed, Files, FileX, PenLine, PhoneOff, ShieldAlert, Toilet, X, type LucideIcon } from "lucide-react";
import type { RoomSchedule } from "@/lib/types";

// ระเบียบการสอบ (Before the Exam Starts) — ตรงกับเสียงประกาศ public/audio/02_exam_rules.mp3
// หน้าเดียว ภาษาอังกฤษ 7 ข้อ ให้นักศึกษาอ่านตามไปพร้อมเสียงได้ทั้งหมด (ไม่แสดงข้อปฏิบัติรายวิชา)
const RULES: { icon: LucideIcon; text: string; strong?: boolean }[] = [
  { icon: PenLine, text: "Read the instructions and sign your name." },
  { icon: Files, text: "Check the number of pages of your exam paper." },
  { icon: ShieldAlert, text: "The penalty for cheating is an F in every course.", strong: true },
  { icon: FileX, text: "Take all unauthorized documents away." },
  { icon: PhoneOff, text: "Your phone must be powered off." },
  { icon: Toilet, text: "The restroom may not be used during the exam." },
  { icon: DoorClosed, text: "Stay in the exam room for at least 45 minutes." },
];

export function InstructionSlides({ schedule, onClose }: { schedule: RoomSchedule; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#FBFBFD] px-6 py-6 lg:px-12 lg:py-10 animate-[pop_300ms_ease-out]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400 lg:text-sm">Examination Rules · {schedule.room_code}</p>
          <h1 className="mt-1 text-[clamp(2rem,6vh,4.5rem)] font-extrabold leading-tight tracking-tight text-slate-950">Before the Exam Starts</h1>
        </div>
        <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100" aria-label="Close">
          <X className="h-6 w-6" />
        </button>
      </div>

      <ol className="mt-[3vh] grid min-h-0 flex-1 auto-rows-fr gap-[1.6vh] lg:grid-cols-2">
        {RULES.map(({ icon: Icon, text, strong }, i) => (
          <li
            key={text}
            className={`flex items-center gap-[2vh] rounded-2xl border px-[2.5vh] ${
              strong ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white"
            } ${i === RULES.length - 1 ? "lg:col-span-2" : ""}`}
          >
            <span
              className={`flex h-[6vh] w-[6vh] flex-shrink-0 items-center justify-center rounded-xl ${
                strong ? "bg-rose-600 text-white" : "bg-slate-900 text-white"
              }`}
            >
              <Icon className="h-[3.2vh] w-[3.2vh]" />
            </span>
            <span className="font-num text-[clamp(1rem,2.4vh,2rem)] font-bold text-slate-300">{i + 1}</span>
            <span className={`text-[clamp(1.1rem,3.1vh,2.6rem)] font-semibold leading-tight ${strong ? "text-rose-700" : "text-slate-900"}`}>
              {text}
            </span>
          </li>
        ))}
      </ol>

    </div>
  );
}
