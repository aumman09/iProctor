"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Megaphone, Trash2, X } from "lucide-react";
import type { ProctorNote } from "@/hooks/useProctorNotes";
import { formatClock } from "@/lib/time";

/** กล่องประกาศของกรรมการบนจอฉาย (FR-05.4) — ตัวใหญ่ อ่านได้จากท้ายห้อง */
export function NoteBoard({ note, compact = false }: { note: ProctorNote; compact?: boolean }) {
  if (!note.visible || !note.text.trim()) return null;
  return (
    <section
      className={`rounded-2xl border-2 border-amber-300 bg-amber-50 text-left ${compact ? "px-4 py-3" : "px-6 py-[1.2vh] lg:px-8"}`}
      aria-live="polite"
    >
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-amber-700">
        <Megaphone className="w-4 h-4" /> Announcement from the proctor
        {note.updatedAt && <span className="font-num font-normal text-amber-600/80">· {formatClock(note.updatedAt).slice(0, 5)}</span>}
      </div>
      <p
        className={`whitespace-pre-wrap break-words font-semibold leading-snug text-slate-900 ${
          compact ? "text-xl lg:text-2xl" : "text-[clamp(0.95rem,3vh,2rem)]"
        }`}
      >
        {note.text}
      </p>
    </section>
  );
}

/** หน้าต่างพิมพ์/แก้ประกาศ — Ctrl+Enter = แสดงบนจอ, Esc = ปิด */
export function NoteEditor({
  note,
  now,
  onSave,
  onClose,
}: {
  note: ProctorNote;
  now: number;
  onSave: (n: ProctorNote) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(note.text);
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => area.current?.focus(), []);

  const show = () => {
    onSave({ text: text.trim(), visible: !!text.trim(), updatedAt: now });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) show();
      }}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Megaphone className="w-5 h-5 text-amber-600" /> On-screen announcement
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <textarea
          ref={area}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          maxLength={500}
          placeholder={"e.g. Course 1302301: page 3, question 5 - option C should read 25%\nDo not share calculators."}
          className="w-full select-text resize-none rounded-xl border border-slate-200 p-3 text-lg leading-snug text-slate-900 placeholder:text-slate-400 focus:border-amber-300 focus:outline-none focus:ring-4 focus:ring-amber-100"
        />
        <p className="mt-1 text-right text-xs text-slate-400 font-num">{text.length}/500 · Ctrl+Enter = show on screen</p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            {note.text && (
              <button
                onClick={() => {
                  onSave({ ...note, visible: !note.visible });
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                {note.visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {note.visible ? "Hide from screen" : "Show previous text"}
              </button>
            )}
            {note.text && (
              <button
                onClick={() => {
                  onSave({ text: "", visible: false, updatedAt: now });
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
          </div>
          <button
            onClick={show}
            disabled={!text.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
          >
            <Megaphone className="w-4 h-4" /> Show on screen
          </button>
        </div>
      </div>
    </div>
  );
}
