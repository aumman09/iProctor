"use client";

import { useActionState, useState } from "react";
import { MessageSquarePlus, Pencil } from "lucide-react";
import { saveCourseNote, type ActionState } from "@/app/admin/actions";

/** แก้ "ข้อกำหนดเพิ่มเติม" ของรายวิชา → แสดงบนการ์ดรายวิชาในหน้าจอคุมสอบ */
export function CourseNoteForm({ slotCourseId, note }: { slotCourseId: number; note: string | null }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, form) => {
    const r = await saveCourseNote(prev, form);
    if (r?.ok) setEditing(false);
    return r;
  }, null);

  if (!editing)
    return (
      <div className="flex min-w-0 items-start gap-2">
        {note ? (
          <p className="min-w-0 flex-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-sm text-amber-900">{note}</p>
        ) : (
          <span className="flex-1 text-sm text-slate-400">—</span>
        )}
        <button
          onClick={() => setEditing(true)}
          className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          {note ? <Pencil className="h-3.5 w-3.5" /> : <MessageSquarePlus className="h-3.5 w-3.5" />}
          {note ? "Edit" : "Add Note"}
        </button>
        {state?.ok && <span className="text-xs text-emerald-600">{state.message}</span>}
      </div>
    );

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="slotCourseId" value={slotCourseId} />
      <textarea
        name="note"
        defaultValue={note ?? ""}
        rows={2}
        maxLength={300}
        autoFocus
        placeholder="e.g. Calculators are permitted. / Open book (1 A4 page)"
        className="w-full resize-none rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-amber-300 focus:outline-none focus:ring-4 focus:ring-amber-100"
      />
      <div className="flex items-center gap-2">
        <button disabled={pending} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100">
          Cancel
        </button>
        <span className="text-xs text-slate-400">Empty = remove note · shown on the exam screen after a reload</span>
        {state && !state.ok && <span className="text-xs text-rose-600">{state.message}</span>}
      </div>
    </form>
  );
}
