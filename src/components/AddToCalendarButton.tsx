"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarPlus, ChevronDown } from "lucide-react";

// Mockup: ปุ่มเพิ่มเวรคุมสอบลงปฏิทินอีเมลของอาจารย์ — ยังไม่เชื่อม Google/Microsoft
// TODO: สร้างไฟล์ .ics (/api/v1/proctor/duties.ics) และลิงก์ subscribe สำหรับ Google Calendar / Outlook
const OPTIONS = ["Google Calendar", "Outlook / Microsoft 365", "Download .ics file"];

export function AddToCalendarButton({ count }: { count: number }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => {
          setOpen((o) => !o);
          setPicked(null);
        }}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <CalendarPlus className="w-4 h-4 text-slate-500" />
        Add to Calendar
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
          <p className="px-2 pb-2 pt-1 text-xs text-slate-500">Add {count} {count === 1 ? "proctoring duty" : "proctoring duties"} to your email calendar</p>
          {OPTIONS.map((o) => (
            <button
              key={o}
              onClick={() => setPicked(o)}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              {o}
            </button>
          ))}
          <p className={`mt-1 rounded-lg px-3 py-2 text-xs ${picked ? "bg-amber-50 text-amber-700" : "text-slate-400"}`}>
            {picked ? `${picked}: not available yet (preview)` : "Preview - calendar sync is not connected yet"}
          </p>
        </div>
      )}
    </div>
  );
}
