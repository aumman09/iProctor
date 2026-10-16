"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Megaphone, ShieldAlert, Volume2, X } from "lucide-react";
import type { AudioEngine } from "@/lib/audio-engine";
import { DEFAULT_RULES_CUES, EXAM_RULES, RULES_HEADING, RULES_WARNING, activeCue } from "@/lib/exam-rules";
import type { RoomSchedule } from "@/lib/types";

const WARNING_CUE = EXAM_RULES.length + 1;

/** ตัว "F" ในคำเตือนเป็นสีแดง */
function redF(text: string) {
  return text.split(/(\bF\b)/).map((part, i) =>
    part === "F" ? (
      <span key={i} className="font-extrabold text-rose-600">
        F
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

/**
 * ประกาศระเบียบการสอบ — หน้าเดียว ไม่มีแถบเลื่อน (รองรับโปรเจกเตอร์ 4:3)
 * อังกฤษด้านบน ไทยสีเทาด้านล่าง; ขณะเล่นเสียงมาตรฐาน ไฮไลต์ข้อที่กำลังอ่านตาม rules_cues
 */
export function InstructionSlides({
  schedule,
  engine,
  onClose,
}: {
  schedule: RoomSchedule;
  engine: AudioEngine;
  onClose: () => void;
}) {
  const cues = schedule.rules_cues ?? DEFAULT_RULES_CUES;
  const [active, setActive] = useState(-1);
  // เสียงอ่านจบ → รอ 2 วินาทีแล้วกลับหน้าจอคุมสอบเอง (เปิดเองโดยไม่มีเสียง = ค้างไว้จนกดปิด)
  const heard = useRef(false);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    let closing: ReturnType<typeof setTimeout> | null = null;
    const id = setInterval(() => {
      setActive(activeCue(cues, engine.rulesPosition()));
      if (engine.isPlayingRules()) heard.current = true;
      else if (heard.current && !closing) closing = setTimeout(() => closeRef.current(), 2000);
    }, 200);
    return () => {
      clearInterval(id);
      if (closing) clearTimeout(closing);
    };
  }, [cues, engine]);

  const playing = active >= 0;
  const card = (i: number) =>
    playing && i === active
      ? "border-slate-900 bg-white shadow-lg ring-4 ring-slate-900/10"
      : `border-slate-200 bg-white ${playing ? "opacity-45" : ""}`;
  const en = "text-[clamp(0.6rem,min(2.2vh,1.6vw),1.6rem)] font-semibold leading-snug text-slate-900";
  const th = "mt-[0.4vh] text-[clamp(0.55rem,min(1.75vh,1.3vw),1.25rem)] leading-snug text-slate-500";

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#FBFBFD] px-[3vw] py-[2.5vh] animate-[pop_300ms_ease-out]">
      <header
        className={`flex items-start justify-between gap-4 rounded-2xl border-2 px-[2vw] py-[1.4vh] transition-all duration-300 ${
          playing && active === 0 ? "border-slate-900 bg-white shadow-lg" : "border-transparent"
        }`}
      >
        <div className="flex items-center gap-[1.5vw]">
          <span className="flex h-[6vh] w-[6vh] flex-shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <Megaphone className="h-[3.2vh] w-[3.2vh]" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Examination Rules · {schedule.room_code}</p>
            <h1 className="text-[clamp(1.4rem,4.2vh,3rem)] font-extrabold leading-tight tracking-tight text-slate-950">{RULES_HEADING.en}</h1>
            <p className="text-[clamp(0.9rem,2.2vh,1.5rem)] text-slate-500">{RULES_HEADING.th}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {playing && (
            <span className="hidden items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white sm:inline-flex">
              <Volume2 className="h-3.5 w-3.5" /> Reading aloud
            </span>
          )}
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100" aria-label="Close">
            <X className="h-6 w-6" />
          </button>
        </div>
      </header>

      <ol className="mt-[1.6vh] grid min-h-0 flex-1 auto-rows-fr gap-[1.4vh] md:grid-cols-2">
        {EXAM_RULES.map((r, i) => (
          <li
            key={i}
            className={`flex min-h-0 gap-[1.2vw] overflow-hidden rounded-2xl border-2 px-[1.6vw] py-[1.2vh] transition-all duration-300 ${card(i + 1)}`}
          >
            <span className="flex h-[4.4vh] w-[4.4vh] flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 font-num text-[clamp(0.9rem,2.2vh,1.5rem)] font-bold text-white">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className={en}>{r.en}</p>
              <p className={th}>{r.th}</p>
            </div>
          </li>
        ))}
      </ol>

      <section
        className={`mt-[1.6vh] flex items-center justify-center gap-[1.5vw] rounded-2xl border-2 px-[2vw] py-[1.4vh] transition-all duration-300 ${
          playing && active === WARNING_CUE ? "border-rose-500 bg-rose-50 shadow-lg ring-4 ring-rose-200" : "border-rose-200 bg-rose-50/60"
        } ${playing && active !== WARNING_CUE ? "opacity-60" : ""}`}
      >
        <ShieldAlert className="h-[5vh] w-[5vh] flex-shrink-0 text-rose-600" />
        <div className="text-center">
          <p className="text-[clamp(1.05rem,2.8vh,2rem)] font-bold leading-snug text-slate-900">{redF(RULES_WARNING.en)}</p>
          <p className="text-[clamp(0.85rem,2vh,1.4rem)] leading-snug text-slate-500">{redF(RULES_WARNING.th)}</p>
        </div>
      </section>
    </div>
  );
}
