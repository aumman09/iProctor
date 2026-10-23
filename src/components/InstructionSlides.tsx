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
  // ระหว่างอ่านข้อ 1–6 หรือคำเตือน → ขยายข้อนั้นเต็มจอ; หัวเรื่อง/ก่อนเริ่ม/อ่านจบ → หน้ารวม (อ่านจบแล้วปิดเองใน 2 วินาที)
  const focus = playing && active >= 1;
  // จอโปรเจกเตอร์: ใช้เทาเข้ม (slate-700) แทนเทาอ่อน และไม่ทำให้ข้ออื่นจางในหน้ารวม
  const en = "text-[clamp(0.6rem,min(2.2vh,1.6vw),1.6rem)] font-semibold leading-snug text-slate-950";
  const th = "mt-[0.4vh] text-[clamp(0.55rem,min(1.75vh,1.3vw),1.25rem)] leading-snug text-slate-700";

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
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-600">Examination Rules · {schedule.room_code}</p>
            <h1 className="text-[clamp(1.4rem,4.2vh,3rem)] font-extrabold leading-tight tracking-tight text-slate-950">{RULES_HEADING.en}</h1>
            <p className="text-[clamp(0.9rem,2.2vh,1.5rem)] text-slate-700">{RULES_HEADING.th}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {playing && (
            // กระพริบตลอดที่เสียงเล่นอยู่ (จุดแดงแบบ "on air" + ป้ายจางเข้าออก)
            <span className="hidden animate-pulse items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white sm:inline-flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
              </span>
              <Volume2 className="h-3.5 w-3.5" /> Audio Playing
            </span>
          )}
          <button onClick={onClose} className="rounded-full p-2 text-slate-600 hover:bg-slate-100" aria-label="Close">
            <X className="h-6 w-6" />
          </button>
        </div>
      </header>

      {focus ? (
        <FocusedRule key={active} cue={active} />
      ) : (
        <>
          <ol className="mt-[1.6vh] grid min-h-0 flex-1 auto-rows-fr gap-[1.4vh] md:grid-cols-2">
            {EXAM_RULES.map((r, i) => (
              <li
                key={i}
                className="flex min-h-0 gap-[1.2vw] overflow-hidden rounded-2xl border-2 border-slate-300 bg-white px-[1.6vw] py-[1.2vh]"
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

          <section className="mt-[1.6vh] flex items-center justify-center gap-[1.5vw] rounded-2xl border-2 border-rose-300 bg-rose-50 px-[2vw] py-[1.4vh]">
            <ShieldAlert className="h-[5vh] w-[5vh] flex-shrink-0 text-rose-600" />
            <div className="text-center">
              <p className="text-[clamp(1.05rem,2.8vh,2rem)] font-bold leading-snug text-slate-900">{redF(RULES_WARNING.en)}</p>
              <p className="text-[clamp(0.85rem,2vh,1.4rem)] leading-snug text-slate-700">{redF(RULES_WARNING.th)}</p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/** ข้อที่เสียงกำลังอ่าน แสดงเต็มจอ (cue 1–6 = ข้อ 1–6, cue 7 = คำเตือน) พร้อมจุดบอกความคืบหน้า */
function FocusedRule({ cue }: { cue: number }) {
  const warning = cue === WARNING_CUE;
  const rule = warning ? RULES_WARNING : EXAM_RULES[cue - 1];
  return (
    <div className="mt-[2vh] flex min-h-0 flex-1 flex-col">
      <section
        className={`flex min-h-0 flex-1 flex-col items-center justify-center gap-[3vh] rounded-3xl border-2 px-[6vw] py-[4vh] text-center animate-[pop_300ms_ease-out] ${
          warning ? "border-rose-400 bg-rose-50" : "border-slate-900 bg-white"
        }`}
      >
        {warning ? (
          <ShieldAlert className="h-[12vh] w-[12vh] text-rose-600" />
        ) : (
          <span className="flex h-[12vh] w-[12vh] items-center justify-center rounded-3xl bg-slate-900 font-num text-[7vh] font-bold text-white">
            {cue}
          </span>
        )}
        <p className="max-w-[90vw] text-[clamp(1.6rem,min(6.5vh,4.2vw),5rem)] font-bold leading-tight text-slate-950">
          {warning ? redF(rule.en) : rule.en}
        </p>
        <p className="max-w-[85vw] text-[clamp(1.1rem,min(4.4vh,3vw),3.4rem)] leading-snug text-slate-700">
          {warning ? redF(rule.th) : rule.th}
        </p>
      </section>

      <div className="mt-[2vh] flex items-center justify-center gap-[1vw]">
        {[...EXAM_RULES.map((_, i) => String(i + 1)), "!"].map((label, i) => {
          const c = i + 1;
          return (
            <span
              key={label}
              className={`flex h-[4.5vh] w-[4.5vh] items-center justify-center rounded-full font-num text-[2.2vh] font-bold ${
                c === cue
                  ? c === WARNING_CUE
                    ? "bg-rose-600 text-white"
                    : "bg-slate-900 text-white"
                  : c < cue
                    ? "bg-slate-300 text-slate-700"
                    : "border-2 border-slate-300 text-slate-600"
              }`}
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
