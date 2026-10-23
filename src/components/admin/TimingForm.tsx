"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";
import { saveTimingSettings, type ActionState } from "@/app/admin/actions";
import type { AlertTiming } from "@/lib/types";

const at = (base: string, deltaMin: number) => {
  const [h, m] = base.split(":").map(Number);
  const t = h * 60 + m + deltaMin;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

/** ความยาววิชาที่เลือกดูใน Preview ได้: 1–3 ชั่วโมง ทีละ 30 นาที */
const DURATIONS = [60, 90, 120, 150, 180];
const hours = (m: number) => (m === 60 ? "1 Hour" : `${m / 60} Hours`);

/** ตั้งเวลาแจ้งเตือน + ตัวอย่างไทม์ไลน์ของรอบบ่าย 13:30 (วิชา A/B เลือกความยาวได้ ค่าเริ่มต้น 3 ชม. กับ 2 ชม.) */
export function TimingForm({ initial }: { initial: AlertTiming }) {
  const [roomOpen, setRoomOpen] = useState(initial.roomOpenBeforeMin);
  const [departure, setDeparture] = useState(initial.departureAfterMin);
  const [warnings, setWarnings] = useState<number[]>(initial.warningsBeforeEndMin);
  const [courseA, setCourseA] = useState(180);
  const [courseB, setCourseB] = useState(120); // 0 = ไม่มีวิชาที่ 2
  const [state, action, pending] = useActionState<ActionState, FormData>(saveTimingSettings, null);

  const valid = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max;
  const sorted = [...new Set(warnings.filter((w) => valid(w, 1, 120)))].sort((a, b) => b - a);
  const courses = [
    { key: "A", min: courseA },
    { key: "B", min: courseB },
  ].filter((c) => c.min > 0);
  const preview = [
    { time: at("13:30", -roomOpen), label: "Room Open · Seating Plan · Welcome Audio" },
    { time: "13:30", label: "Exam Start · Exam Rules" },
    { time: at("13:30", departure), label: "Leaving Allowed (Chime)" },
    ...courses.flatMap((c) => [
      // เตือนที่ยาวกว่าวิชา = ก่อนเริ่มสอบ → ไม่แสดง
      ...sorted.filter((w) => w < c.min).map((w) => ({ time: at("13:30", c.min - w), label: `${w} Minute Left — Course ${c.key} (${hours(c.min)})` })),
      { time: at("13:30", c.min), label: `Time Up — Course ${c.key} (${hours(c.min)})` },
    ]),
  ].sort((a, b) => a.time.localeCompare(b.time));
  const select = "rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700";

  const num = "w-24 rounded-xl border border-slate-200 px-3 py-2 text-right font-num text-sm focus:border-slate-400 focus:outline-none";

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <form action={action} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-3">
        <Row label="Open Room Before Start" hint="Full-screen seating plan + welcome audio (0–120 Minute)">
          <input name="roomOpenBeforeMin" type="number" min={0} max={120} value={roomOpen} onChange={(e) => setRoomOpen(Number(e.target.value))} className={num} />
          <span className="text-sm text-slate-500">Minute</span>
        </Row>
        <Row label="Allow Leaving After Start" hint="Popup + chime (0–240 Minute)">
          <input name="departureAfterMin" type="number" min={0} max={240} value={departure} onChange={(e) => setDeparture(Number(e.target.value))} className={num} />
          <span className="text-sm text-slate-500">Minute</span>
        </Row>
        <Row label="Warn Before a Course Ends" hint="Up to 5 warnings (1–120 Minute) · one chime each">
          <div className="flex flex-wrap items-center gap-2">
            {warnings.map((w, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 py-1 pl-2 pr-1">
                <input
                  name="warning"
                  type="number"
                  min={1}
                  max={120}
                  value={w}
                  onChange={(e) => setWarnings((ws) => ws.map((x, j) => (j === i ? Number(e.target.value) : x)))}
                  className="w-14 bg-transparent text-right font-num text-sm focus:outline-none"
                  aria-label={`Warning ${i + 1} (minutes)`}
                />
                <span className="text-xs text-slate-400">Minute</span>
                <button
                  type="button"
                  onClick={() => setWarnings((ws) => ws.filter((_, j) => j !== i))}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                  aria-label="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            {warnings.length < 5 && (
              <button
                type="button"
                onClick={() => setWarnings((ws) => [...ws, 5])}
                className="inline-flex items-center gap-1 rounded-xl border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-500 hover:border-slate-400 hover:text-slate-900"
              >
                <Plus className="h-4 w-4" /> Add Warning
              </button>
            )}
            {warnings.length === 0 && <span className="text-sm text-slate-400">No warnings before time is up</span>}
          </div>
        </Row>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
          <button disabled={pending} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setRoomOpen(15);
              setDeparture(45);
              setWarnings([10]);
            }}
            className="rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-100"
          >
            Reset to Defaults (15 / 45 / 10 Minute)
          </button>
          {state && <span className={`text-sm ${state.ok ? "text-emerald-600" : "text-rose-600"}`}>{state.message}</span>}
        </div>
      </form>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
        <h2 className="font-semibold text-slate-900">Timeline Preview</h2>
        <p className="mt-0.5 text-xs text-slate-500">Afternoon session 13:30 · course length 1–3 hours in 30-minute steps</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <label className="inline-flex items-center gap-1.5">
            Course A
            <select value={courseA} onChange={(e) => setCourseA(Number(e.target.value))} className={select}>
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {hours(d)}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-1.5">
            Course B
            <select value={courseB} onChange={(e) => setCourseB(Number(e.target.value))} className={select}>
              <option value={0}>None</option>
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {hours(d)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ol className="mt-4 space-y-0">
          {preview.map((p, i) => (
            <li key={i} className="relative flex gap-3 pb-4 pl-5 last:pb-0">
              <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-slate-400" />
              {i < preview.length - 1 && <span className="absolute left-[3px] top-4 h-full w-px bg-slate-200" />}
              <span className="w-12 flex-shrink-0 font-num text-sm font-semibold text-slate-900">{p.time}</span>
              <span className="text-sm text-slate-600">{p.label}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[14rem_1fr] sm:items-center">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
