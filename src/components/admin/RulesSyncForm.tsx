"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, StepForward } from "lucide-react";
import { saveRulesSync, type ActionState } from "@/app/admin/actions";
import { DEFAULT_RULES_CUES, EXAM_RULES, RULES_HEADING, RULES_WARNING, activeCue } from "@/lib/exam-rules";

const PARTS = [
  { label: "Heading", text: RULES_HEADING.en },
  ...EXAM_RULES.map((r, i) => ({ label: `Rule ${i + 1}`, text: r.en })),
  { label: "Warning", text: RULES_WARNING.en },
];

/**
 * ซิงก์ไฮไลต์ระเบียบการสอบกับเสียง: กด Start marking → ระหว่างฟังกด "Mark next" (หรือ Space)
 * ทุกครั้งที่เสียงเริ่มอ่านช่วงถัดไป → Save
 */
export function RulesSyncForm({ initial }: { initial: number[] }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [cues, setCues] = useState<number[]>(initial);
  const [marking, setMarking] = useState<number | null>(null);
  const [t, setT] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(saveRulesSync, null);

  useEffect(() => {
    const id = setInterval(() => setT(audio.current && !audio.current.paused ? audio.current.currentTime : null), 150);
    return () => clearInterval(id);
  }, []);

  const startMarking = () => {
    const a = audio.current;
    if (!a) return;
    a.currentTime = 0;
    void a.play();
    setCues((c) => [0, ...c.slice(1)]);
    setMarking(1);
  };
  const markNext = () => {
    const a = audio.current;
    if (!a || marking === null) return;
    const now = Math.round(a.currentTime * 10) / 10;
    setCues((c) => c.map((v, i) => (i === marking ? now : v)));
    if (marking + 1 >= PARTS.length) setMarking(null);
    else setMarking(marking + 1);
  };

  useEffect(() => {
    if (marking === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        markNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const active = activeCue(cues, t);

  return (
    <form action={action} className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Exam Rules Audio Sync</h2>
          <p className="mt-0.5 max-w-2xl text-xs text-slate-500">
            Highlights the rule being read aloud on the exam screen. Press <b>Start Marking</b>, then press <b>Mark Next</b> (or Space) each
            time the audio starts the next part. Play to preview, then save.
          </p>
        </div>
        <audio
          ref={audio}
          src="/audio/02_exam_rules.mp3"
          preload="auto"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setMarking(null);
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => (playing ? audio.current?.pause() : void audio.current?.play())}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {playing ? "Pause" : "Play"}
            <span className="font-num text-slate-400">{t !== null ? `${t.toFixed(1)}s` : ""}</span>
          </button>
          {marking === null ? (
            <button type="button" onClick={startMarking} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              Start Marking
            </button>
          ) : (
            <button
              type="button"
              onClick={markNext}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <StepForward className="h-4 w-4" /> Mark Next: {PARTS[marking].label}
            </button>
          )}
        </div>
      </div>

      <ol className="mt-4 divide-y divide-slate-100">
        {PARTS.map((p, i) => (
          <li
            key={p.label}
            className={`flex items-center gap-3 rounded-lg px-2 py-2 ${active === i ? "bg-slate-900 text-white" : ""} ${
              marking === i ? "ring-2 ring-emerald-400" : ""
            }`}
          >
            <span className={`w-20 flex-shrink-0 text-xs font-semibold ${active === i ? "text-slate-300" : "text-slate-500"}`}>{p.label}</span>
            <span className={`min-w-0 flex-1 truncate text-sm ${active === i ? "text-white" : "text-slate-700"}`}>{p.text}</span>
            <input
              name="cue"
              type="number"
              step="0.1"
              min={0}
              max={600}
              value={cues[i]}
              readOnly={i === 0}
              onChange={(e) => setCues((c) => c.map((v, j) => (j === i ? Number(e.target.value) : v)))}
              className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-right font-num text-sm text-slate-900"
              aria-label={`${p.label} start (seconds)`}
            />
            <span className={`text-xs ${active === i ? "text-slate-300" : "text-slate-400"}`}>s</span>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        <button disabled={pending} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setCues(DEFAULT_RULES_CUES)}
          className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-100"
        >
          <RotateCcw className="h-4 w-4" /> Reset to Estimate
        </button>
        {state && <span className={`text-sm ${state.ok ? "text-emerald-600" : "text-rose-600"}`}>{state.message}</span>}
      </div>
    </form>
  );
}
