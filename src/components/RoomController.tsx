"use client";

import { useCallback, useEffect, useState } from "react";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { useExamEngine } from "@/hooks/useExamEngine";
import { useOfficialTimer, type SimClock } from "@/hooks/useOfficialTimer";
import { useProctorNotes } from "@/hooks/useProctorNotes";
import { useRoomLayout } from "@/hooks/useRoomLayout";
import { useRoomSchedule } from "@/hooks/useRoomSchedule";
import { timingOf } from "@/lib/schedule-engine";
import { seatRangeLabel } from "@/lib/seat-range";
import { guessSession, parseSimStart, shortTime, todayISO } from "@/lib/time";
import type { ExamEvent, SessionName } from "@/lib/types";
import { AlertCenter, type Alert } from "./AlertCenter";
import { AudioUnlockGate } from "./AudioUnlockGate";
import { CompletionDialog } from "./CompletionDialog";
import { ControlBar } from "./ControlBar";
import { CourseCard } from "./CourseCard";
import { Header } from "./Header";
import { InstructionSlides } from "./InstructionSlides";
import { OfficialClock } from "./OfficialClock";
import { NoteBoard, NoteEditor } from "./ProctorNotes";
import { SeatingOverlay } from "./SeatingOverlay";

const VERSION = "v2.0";

export interface RoomControllerProps {
  roomId: string;
  /** ?date=YYYY-MM-DD (ค่าเริ่มต้น: วันนี้) */
  date?: string;
  /** ?session=morning|afternoon (ค่าเริ่มต้น: เลือกจากเวลาปัจจุบัน) */
  session?: SessionName;
  /** ?sim=HH:MM[:SS] เปิดโหมดจำลองเวลาเริ่มที่เวลานี้ */
  sim?: string;
  /** ?speed=1|10|60 ความเร็วเวลาจำลอง */
  speed?: number;
  /** ?demo=1 ใช้ตารางจำลองถ้าห้องนี้ไม่มีรอบสอบจริง */
  demo?: boolean;
}

export function RoomController(props: RoomControllerProps) {
  // คอมโพเนนต์นี้ render ฝั่ง client เท่านั้น (ดู RoomScreen) จึงใช้เวลา/timezone ของเครื่องในห้องสอบได้ตรง ๆ
  const [init] = useState(() => {
    const real = Date.now();
    const date = props.date ?? todayISO(real);
    const simAt = parseSimStart(date, props.sim);
    return {
      target: { date, session: props.session ?? guessSession(simAt ?? real) },
      sim: simAt !== null ? { startAt: simAt, realStart: real, speed: props.speed ?? 1 } : null,
    };
  });
  const target = init.target;
  const [sim, setSim] = useState<SimClock | null>(init.sim);

  const { schedule, source, error } = useRoomSchedule(props.roomId, target.date, target.session, props.demo);
  const { now, offsetMs, synced } = useOfficialTimer(sim);
  const audio = useAudioEngine();
  const layout = useRoomLayout(props.roomId);
  // null = อัตโนมัติ (Pre-Exam Mode แสดงผังเต็มจอ), true/false = ผู้คุมสอบสลับเอง
  const [seatingOverride, setSeatingOverride] = useState<boolean | null>(null);
  // FR-05.4 ประกาศของกรรมการ — เก็บในเครื่องฉาย แยกตามห้อง/วัน/รอบ (โหมดจำลองแยก key ไม่ปนของจริง)
  const notes = useProctorNotes(`${props.roomId}:${target.date}:${target.session}${sim ? ":sim" : ""}`);
  const [editingNote, setEditingNote] = useState(false);
  // โหมดฉายเต็มจอ: ทุกอย่างต้องพอดีจอเดียว (รวมโปรเจกเตอร์ 4:3) และซ่อนแถบควบคุม (เลื่อนขึ้นเมื่อชี้ขอบล่าง)
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const sync = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  // สถานะ "สอบเสร็จ" ที่กดในหน้านี้ (ทับค่าจาก schedule) + รายวิชาที่กำลังยืนยัน
  const [completion, setCompletion] = useState<Record<string, string | null>>({});
  const [confirming, setConfirming] = useState<string | null>(null);

  // heartbeat ทุก 1 นาทีขณะเปิดหน้าจอ → Admin เห็นไฟเขียว "กำลังคุมสอบ" (ไม่ส่งในโหมดจำลองเวลา/demo — ไม่ใช่การคุมสอบจริง)
  const live = !sim && !props.demo;
  useEffect(() => {
    if (!live) return;
    const beat = () =>
      void fetch(`/api/v1/exam-rooms/${encodeURIComponent(props.roomId)}/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: target.date, session: target.session }),
        keepalive: true,
      }).catch(() => {});
    beat();
    const id = setInterval(beat, 60_000);
    return () => clearInterval(id);
  }, [live, props.roomId, target.date, target.session]);

  const { engine: audioEngine } = audio;
  useEffect(() => {
    void audioEngine.useRoom(props.roomId);
  }, [audioEngine, props.roomId]);

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [slides, setSlides] = useState<"auto" | "manual" | null>(null);

  const pushAlert = useCallback((a: Alert) => setAlerts((prev) => [...prev.filter((x) => x.id !== a.id), a]), []);
  const dismissAlert = useCallback((id: string) => setAlerts((prev) => prev.filter((a) => a.id !== id)), []);

  const handleEvent = useCallback(
    (ev: ExamEvent) => {
      if (!schedule) return;
      const course = schedule.courses.find((c) => c.course_id === ev.courseId);
      const courseLabel = course ? `${course.course_code} ${course.course_name}${course.row_label ? ` (Seat ${course.row_label})` : ""}` : "";

      switch (ev.type) {
        case "ROOM_OPEN":
          audio.engine.enqueue("welcome");
          pushAlert({
            id: ev.id,
            kind: "info",
            variant: "toast",
            title: "The exam room is now open",
            description: "Please take your assigned seat according to your seat number and sign colour.",
          });
          break;

        case "EXAM_START":
          audio.engine.enqueue("rules");
          setSlides("auto");
          break;

        case "DEPARTURE_ALLOWED":
          audio.engine.enqueue("departure");
          pushAlert({
            id: ev.id,
            kind: "departure",
            variant: "modal",
            title: "45 minutes have elapsed",
            autoDismissMs: 10_000,
            description:
              "Students who have finished may now submit their answer sheets and leave the examination room quietly.",
          });
          break;

        case "COURSE_WARNING":
          audio.engine.enqueue("warning");
          pushAlert({
            id: ev.id,
            kind: "warning",
            variant: "toast",
            title: `${ev.minutesLeft ?? timingOf(schedule).warningsBeforeEndMin[0] ?? 10} minutes remaining${course?.row_label ? ` (Seat ${course.row_label})` : ""}`,
            description: `${courseLabel} ends at ${course ? shortTime(course.end_time) : ""}. Please check your name and student ID on the answer sheet.`,
          });
          break;

        case "COURSE_END": {
          audio.engine.enqueue("timeout");
          const continuing = schedule.courses.filter((c) => c.course_id !== ev.courseId && c.end_time > (course?.end_time ?? ""));
          const seat = (c?: { row_label: string }) => (c?.row_label ? `Seat ${c.row_label}` : "");
          pushAlert({
            id: ev.id,
            kind: "end",
            variant: "modal",
            title: ["Time is up", seat(course), course?.course_code].filter(Boolean).join(" · "),
            description:
              "Time is up. Please put down your pen and remain seated until all answer sheets are collected." +
              (continuing.length ? ` (Students in ${continuing.map(seat).join(", ")} may continue.)` : ""),
          });
          break;
        }

        case "SESSION_END":
          // TODO: เสียงประกาศจบรอบสอบ (ถ้ามี) / สรุปผลการคุมสอบ
          break;
      }
    },
    [schedule, audio.engine, pushAlert],
  );

  // ปุ่มทดสอบสถานการณ์: ยิงเหตุการณ์จำลองทันที (เสียง + popup/สไลด์/ผัง) ไม่กระทบเวลาและสถานะจริง
  const testEvent = (type: ExamEvent["type"], courseId?: string) => {
    if (now === null) return;
    handleEvent({ id: `test:${type}:${courseId ?? ""}:${Date.now()}`, type, at: now, courseId });
    if (type === "ROOM_OPEN") setSeatingOverride(true);
    if (type === "EXAM_START") setSlides("manual");
  };

  const persistKey = !sim ? `${props.roomId}:${target.date}:${target.session}` : null;
  const { timeline, courses, phase } = useExamEngine(schedule, now, persistKey, handleEvent);

  if (!schedule || now === null || !phase) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">
        {error ? `Could not load the exam schedule: ${error}` : "Loading exam schedule…"}
      </div>
    );
  }

  const completedAt = (courseId: string) =>
    courseId in completion ? completion[courseId] : (schedule.courses.find((c) => c.course_id === courseId)?.completed_at ?? null);
  const confirmingCourse = confirming ? schedule.courses.find((c) => c.course_id === confirming) : undefined;

  /** บันทึกสถานะสอบเสร็จที่เซิร์ฟเวอร์ — คืนข้อความ error (ภาษาอังกฤษ) หรือ null */
  const saveCompletion = async (courseId: string, completed: boolean): Promise<string | null> => {
    // ตารางจำลอง (demo) ไม่มีในฐานข้อมูล → เปลี่ยนสถานะเฉพาะบนจอ
    if (courseId.startsWith("demo-")) {
      setCompletion((prev) => ({ ...prev, [courseId]: completed ? new Date(now).toISOString() : null }));
      return null;
    }
    try {
      const res = await fetch(`/api/v1/slot-courses/${encodeURIComponent(courseId)}/completion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      if (res.status === 401) return "Please sign in to the iProctor portal on this computer first, then try again.";
      if (res.status === 403) return "You are not assigned as a proctor for this exam room.";
      if (!res.ok) return `Could not save (HTTP ${res.status}). Please try again.`;
      const data = (await res.json()) as { completed_at: string | null };
      setCompletion((prev) => ({ ...prev, [courseId]: data.completed_at }));
      return null;
    } catch {
      return "Network error — please check the connection and try again.";
    }
  };

  const showSeating = !!layout && (seatingOverride ?? phase === "PRE_EXAM");
  const showSlides = slides === "manual" || (slides === "auto" && phase === "INSTRUCTION");

  return (
    <div className={`flex flex-col justify-between select-none ${fullscreen ? "h-[100dvh] overflow-hidden" : "min-h-screen"}`}>
      <Header roomCode={schedule.room_code} status={sim || props.demo ? "simulation" : source === "cache" ? "offline" : "active"} />

      <OfficialClock now={now} schedule={schedule} phase={phase} shrink={notes.note.visible && !!notes.note.text.trim()} />

      <main className="max-w-5xl mx-auto w-full px-6 flex-1 min-h-0 flex flex-col gap-[1.5vh] justify-center pb-[1.5vh]">
        <NoteBoard note={notes.note} />
        {courses.map((c) => (
          <CourseCard
            key={c.course.course_id}
            state={c}
            now={now}
            completedAt={completedAt(c.course.course_id)}
            onToggleComplete={() => setConfirming(c.course.course_id)}
            sections={(c.course.sections ?? [{ section: c.course.section }]).map((s, _, all) => ({
              section: s.section,
              seats:
                s.seat_from && s.seat_to
                  ? `Seats ${s.seat_from} – ${s.seat_to}`
                  : all.length === 1
                    ? seatRangeLabel(layout, c.course.row_label)
                    : "",
            }))}
          />
        ))}
      </main>

      <ControlDock hidden={fullscreen}>
      <ControlBar
        version={VERSION}
        synced={synced}
        offsetMs={offsetMs}
        muted={audio.muted}
        onToggleMute={() => audio.engine.setMuted(!audio.muted)}
        onTestSound={() => void audio.engine.test()}
        onShowSlides={() => setSlides("manual")}
        onShowSeating={layout ? () => setSeatingOverride(true) : null}
        onEditNote={() => setEditingNote(true)}
        test={{ courses: schedule.courses, onTrigger: testEvent }}
        noteVisible={notes.note.visible && !!notes.note.text}
        customAudio={{
          name: audio.customName,
          onPick: (f) => void audio.engine.setCustomStartFile(f),
          onPreview: () => void audio.engine.previewStart(),
          onClear: () => void audio.engine.clearCustomStart(),
        }}
        sim={
          sim && {
            schedule,
            timeline,
            speed: sim.speed,
            onJump: (at) => setSim({ startAt: at, realStart: Date.now(), speed: sim.speed }),
            onSpeed: (speed) => setSim({ startAt: now, realStart: Date.now(), speed }),
          }
        }
      />
      </ControlDock>

      {showSeating && layout && (
        <SeatingOverlay
          layout={layout}
          now={now}
          schedule={schedule}
          phase={phase}
          note={notes.note}
          autoMode={seatingOverride === null}
          onClose={() => setSeatingOverride(false)}
        />
      )}
      {showSlides && (
        <InstructionSlides
          schedule={schedule}
          engine={audio.engine}
          onClose={() => {
            // ปิดหน้าระเบียบการสอบ = หยุดเสียงอ่านด้วย
            audio.engine.stopRules();
            setSlides(null);
          }}
        />
      )}
      <AlertCenter alerts={alerts} onDismiss={dismissAlert} />
      {confirmingCourse && (
        <CompletionDialog
          course={confirmingCourse}
          undo={!!completedAt(confirmingCourse.course_id)}
          onConfirm={() => saveCompletion(confirmingCourse.course_id, !completedAt(confirmingCourse.course_id))}
          onClose={() => setConfirming(null)}
        />
      )}
      {editingNote && <NoteEditor note={notes.note} now={now} onSave={notes.save} onClose={() => setEditingNote(false)} />}
      {!audio.unlocked && <AudioUnlockGate roomCode={schedule.room_code} onUnlock={() => void audio.engine.unlock()} />}
    </div>
  );
}

/** โหมดเต็มจอ: แถบควบคุมซ่อนอยู่ใต้ขอบจอ — เลื่อนเมาส์ไปขอบล่างเพื่อแสดง (นักศึกษาเห็นแค่นาฬิกา/เวลาสอบ) */
function ControlDock({ hidden, children }: { hidden: boolean; children: React.ReactNode }) {
  if (!hidden) return <>{children}</>;
  return (
    <div className="group fixed inset-x-0 bottom-0 z-40 pt-8">
      <div className="translate-y-full border-t border-slate-200 bg-white/95 opacity-0 backdrop-blur transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        {children}
      </div>
    </div>
  );
}
