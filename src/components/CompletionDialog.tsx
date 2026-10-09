"use client";

import { useState } from "react";
import { CircleCheck, RotateCcw } from "lucide-react";
import type { Course } from "@/lib/types";

/** ยืนยันก่อนบันทึกว่ารายวิชาสอบเสร็จ (หรือยกเลิก) — ข้อความภาษาอังกฤษตามที่ผู้ใช้กำหนด */
export function CompletionDialog({
  course,
  undo,
  onConfirm,
  onClose,
}: {
  course: Course;
  /** true = ยกเลิกสถานะสอบเสร็จ */
  undo: boolean;
  onConfirm: () => Promise<string | null>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seat = course.row_label ? ` (Seat ${course.row_label})` : "";

  const confirm = async () => {
    setBusy(true);
    const err = await onConfirm();
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm"
      onKeyDown={(e) => e.key === "Escape" && !busy && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 text-center shadow-xl animate-[pop_200ms_ease-out]">
        <div
          className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${
            undo ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
          }`}
        >
          {undo ? <RotateCcw className="h-7 w-7" /> : <CircleCheck className="h-7 w-7" />}
        </div>
        <h2 className="text-xl font-bold text-slate-900">{undo ? "Mark as not completed?" : "Confirm exam completion"}</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">
          {course.course_code} {course.course_name}
          {seat}
        </p>
        <p className="mt-4 text-slate-600">
          {undo
            ? "This course will return to “in progress” and the Exam Office dashboard will be updated."
            : "Has this exam finished and have all answer sheets been collected? The Exam Office will be notified."}
        </p>
        {error && <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-slate-200 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={busy}
            autoFocus
            className={`rounded-xl py-3 font-semibold text-white disabled:opacity-60 ${
              undo ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {busy ? "Saving…" : undo ? "Yes, undo" : "Yes, completed"}
          </button>
        </div>
      </div>
    </div>
  );
}
