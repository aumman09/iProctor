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

/** ตั้งเวลาแจ้งเตือน + ตัวอย่างไทม์ไลน์ของรอบบ่าย (13:30–16:30 วิชา 3 ชม. และ 13:30–15:30 วิชา 2 ชม.) */
export function TimingForm({ initial }: { initial: AlertTiming }) {
  const [roomOpen, setRoomOpen] = useState(initial.roomOpenBeforeMin);
  const [departure, setDeparture] = useState(initial.departureAfterMin);
  const [warnings, setWarnings] = useState<number[]>(initial.warningsBeforeEndMin);
  const [state, action, pending] = useActionState<ActionState, FormData>(saveTimingSettings, null);

  const valid = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max;
  const sorted = [...new Set(warnings.filter((w) => valid(w, 1, 120)))].sort((a, b) => b - a);
  const preview = [
    { time: at("13:30", -roomOpen), label: "เปิดห้อง · แสดงผังที่นั่ง · เสียงต้อนรับ" },
    { time: "13:30", label: "เริ่มสอบ · ระเบียบการสอบ" },
    { time: at("13:30", departure), label: "อนุญาตให้ออกจากห้อง (กระดิ่ง)" },
    ...sorted.flatMap((w) => [
      { time: at("15:30", -w), label: `เหลือ ${w} นาที — วิชา 2 ชม.` },
      { time: at("16:30", -w), label: `เหลือ ${w} นาที — วิชา 3 ชม.` },
    ]),
    { time: "15:30", label: "หมดเวลา — วิชา 2 ชม." },
    { time: "16:30", label: "หมดเวลา — วิชา 3 ชม." },
  ].sort((a, b) => a.time.localeCompare(b.time));

  const num = "w-24 rounded-xl border border-slate-200 px-3 py-2 text-right font-num text-sm focus:border-slate-400 focus:outline-none";

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <form action={action} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-3">
        <Row label="เปิดห้องสอบก่อนเริ่ม" hint="แสดงผังที่นั่งเต็มจอ + เสียงต้อนรับ (0–120 นาที)">
          <input name="roomOpenBeforeMin" type="number" min={0} max={120} value={roomOpen} onChange={(e) => setRoomOpen(Number(e.target.value))} className={num} />
          <span className="text-sm text-slate-500">นาที</span>
        </Row>
        <Row label="อนุญาตให้ออกจากห้องหลังเริ่มสอบ" hint="popup + กระดิ่ง (0–240 นาที)">
          <input name="departureAfterMin" type="number" min={0} max={240} value={departure} onChange={(e) => setDeparture(Number(e.target.value))} className={num} />
          <span className="text-sm text-slate-500">นาที</span>
        </Row>
        <Row label="เตือนก่อนหมดเวลารายวิชา" hint="เพิ่มได้สูงสุด 5 ครั้ง (1–120 นาที) · กระดิ่งครั้งเดียวต่อครั้ง">
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
                  aria-label={`เตือนครั้งที่ ${i + 1} (นาที)`}
                />
                <span className="text-xs text-slate-400">นาที</span>
                <button
                  type="button"
                  onClick={() => setWarnings((ws) => ws.filter((_, j) => j !== i))}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                  aria-label="ลบ"
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
                <Plus className="h-4 w-4" /> เพิ่มเวลาเตือน
              </button>
            )}
            {warnings.length === 0 && <span className="text-sm text-slate-400">ไม่มีการเตือนก่อนหมดเวลา</span>}
          </div>
        </Row>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
          <button disabled={pending} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
            {pending ? "กำลังบันทึก…" : "บันทึก"}
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
            คืนค่าเริ่มต้น (15 / 45 / 10)
          </button>
          {state && <span className={`text-sm ${state.ok ? "text-emerald-600" : "text-rose-600"}`}>{state.message}</span>}
        </div>
      </form>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
        <h2 className="font-semibold text-slate-900">ตัวอย่างไทม์ไลน์</h2>
        <p className="mt-0.5 text-xs text-slate-500">รอบบ่าย 13:30 · วิชา 3 ชม. และ 2 ชม. ในห้องเดียวกัน</p>
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
