"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { RoomSchedule } from "@/lib/types";
import { SEAT_THEME } from "./seat-theme";

// TODO: แก้ข้อความระเบียบการสอบให้ตรงกับประกาศของส่วนทะเบียนฯ
const GENERAL_RULES: { th: string; en: string }[] = [
  { th: "ปิดโทรศัพท์มือถือและอุปกรณ์สื่อสารทุกชนิด และนำไปวางไว้หน้าห้องสอบ", en: "Switch off all mobile phones and communication devices." },
  { th: "ตรวจสอบรหัสวิชา ชื่อ-นามสกุล และรหัสนักศึกษาบนกระดาษคำตอบให้ถูกต้อง", en: "Check course code, name and student ID on your answer sheet." },
  { th: "ห้ามพูดคุย หยิบยืมอุปกรณ์ หรือกระทำการใด ๆ ที่ส่อไปในทางทุจริต", en: "No talking, borrowing, or any form of academic misconduct." },
  { th: "นักศึกษาออกจากห้องสอบได้หลังเริ่มสอบแล้ว 45 นาที", en: "You may leave the room only after the first 45 minutes." },
];

const SLIDE_MS = 12_000;

export function InstructionSlides({ schedule, onClose }: { schedule: RoomSchedule; onClose: () => void }) {
  const slides = [
    ...GENERAL_RULES.map((r, i) => ({ key: `rule-${i}`, badge: String(i + 1), badgeCls: "bg-slate-950 text-white border-slate-950", ...r, sub: null as string | null })),
    ...schedule.courses
      .filter((c) => c.instructions)
      .map((c) => ({
        key: `course-${c.course_id}`,
        badge: c.row_label,
        badgeCls: SEAT_THEME[c.seat_color_theme]?.badge ?? SEAT_THEME.white.badge,
        th: c.instructions!,
        en: "",
        sub: `${c.course_code} ${c.course_name} · ${c.seat_description}`,
      })),
  ];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), SLIDE_MS);
    return () => clearInterval(id);
  }, [slides.length]);

  const slide = slides[index];

  return (
    <div className="fixed inset-0 z-50 bg-[#FBFBFD] flex flex-col">
      <div className="flex justify-between items-center px-8 pt-8">
        <span className="text-xs lg:text-sm font-bold tracking-[0.25em] text-slate-400 uppercase">
          Examination Rules · ระเบียบการสอบ
        </span>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400" aria-label="Close">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div key={slide.key} className="flex-1 flex flex-col items-center justify-center text-center px-10 animate-[pop_300ms_ease-out]">
        <div className={`w-20 h-20 rounded-3xl border flex items-center justify-center text-3xl font-bold mb-8 ${slide.badgeCls}`}>
          {slide.badge}
        </div>
        {slide.sub && <p className="text-lg lg:text-2xl text-slate-400 mb-4">{slide.sub}</p>}
        <p className="text-4xl lg:text-6xl font-semibold tracking-tight text-slate-900 max-w-5xl leading-tight">{slide.th}</p>
        {slide.en && <p className="text-xl lg:text-3xl text-slate-400 mt-6 max-w-4xl">{slide.en}</p>}
      </div>

      <div className="flex justify-center gap-2 pb-10">
        {slides.map((s, i) => (
          <button
            key={s.key}
            onClick={() => setIndex(i)}
            className={`h-2 rounded-full transition-all ${i === index ? "w-8 bg-slate-900" : "w-2 bg-slate-300"}`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
