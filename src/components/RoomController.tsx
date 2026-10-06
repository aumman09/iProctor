"use client";

import { useCallback, useEffect, useState } from "react";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { useExamEngine } from "@/hooks/useExamEngine";
import { useOfficialTimer, type SimClock } from "@/hooks/useOfficialTimer";
import { useRoomLayout } from "@/hooks/useRoomLayout";
import { useRoomSchedule } from "@/hooks/useRoomSchedule";
import { guessSession, parseSimStart, shortTime, todayISO } from "@/lib/time";
import type { ExamEvent, SessionName } from "@/lib/types";
import { AlertCenter, type Alert } from "./AlertCenter";
import { AudioUnlockGate } from "./AudioUnlockGate";
import { ControlBar } from "./ControlBar";
import { CourseCard } from "./CourseCard";
import { Header } from "./Header";
import { InstructionSlides } from "./InstructionSlides";
import { OfficialClock } from "./OfficialClock";
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

  const { schedule, source, error } = useRoomSchedule(props.roomId, target.date, target.session);
  const { now, offsetMs, synced } = useOfficialTimer(sim);
  const audio = useAudioEngine();
  const layout = useRoomLayout(props.roomId);
  // null = อัตโนมัติ (Pre-Exam Mode แสดงผังเต็มจอ), true/false = ผู้คุมสอบสลับเอง
  const [seatingOverride, setSeatingOverride] = useState<boolean | null>(null);

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
      const courseLabel = course ? `วิชา ${course.course_code} ${course.course_name} (แถว ${course.row_label})` : "";

      switch (ev.type) {
        case "ROOM_OPEN":
          audio.engine.enqueue("welcome");
          pushAlert({
            id: ev.id,
            kind: "info",
            variant: "toast",
            title: "เปิดห้องสอบแล้ว",
            description: "กรุณาตรวจสอบรหัสนักศึกษาและนั่งตามแถว/สีป้ายที่กำหนด (Please take your assigned seat)",
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
            title: "ครบกำหนด 45 นาทีแรกของการสอบ",
            description:
              "นักศึกษาที่ทำข้อสอบเสร็จเรียบร้อยแล้ว ได้รับอนุญาตให้ส่งกระดาษคำตอบและออกจากห้องสอบได้ (Students who have finished are permitted to submit and leave.)",
          });
          break;

        case "COURSE_WARNING":
          audio.engine.enqueue("warning");
          pushAlert({
            id: ev.id,
            kind: "warning",
            variant: "toast",
            title: `เหลือเวลาอีก 10 นาที (แถว ${course?.row_label})`,
            description: `${courseLabel} จะหมดเวลาสอบเมื่อ ${course ? shortTime(course.end_time) : ""} น. กรุณาตรวจสอบชื่อและรหัสนักศึกษา`,
          });
          break;

        case "COURSE_END": {
          audio.engine.enqueue("timeout");
          const continuing = schedule.courses.filter((c) => c.course_id !== ev.courseId && c.end_time > (course?.end_time ?? ""));
          pushAlert({
            id: ev.id,
            kind: "end",
            variant: "modal",
            title: `หมดเวลาทำข้อสอบ (แถว ${course?.row_label})`,
            description:
              `${courseLabel} สิ้นสุดเวลาแล้ว กรุณาวางปากกา กรรมการจะดำเนินการเก็บข้อสอบ` +
              (continuing.length ? ` — นักศึกษาแถว ${continuing.map((c) => c.row_label).join(", ")} ทำข้อสอบต่อได้ตามปกติ` : ""),
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

  const persistKey = !sim ? `${props.roomId}:${target.date}:${target.session}` : null;
  const { timeline, courses, phase } = useExamEngine(schedule, now, persistKey, handleEvent);

  if (!schedule || now === null || !phase) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">
        {error ? `โหลดตารางสอบไม่สำเร็จ: ${error}` : "กำลังโหลดตารางสอบ…"}
      </div>
    );
  }

  const showSeating = !!layout && (seatingOverride ?? phase === "PRE_EXAM");
  const showSlides = slides === "manual" || (slides === "auto" && phase === "INSTRUCTION");

  return (
    <div className="min-h-screen flex flex-col justify-between select-none">
      <Header roomCode={schedule.room_code} status={sim ? "simulation" : source === "cache" ? "offline" : "active"} />

      <OfficialClock now={now} schedule={schedule} phase={phase} />

      <main className="max-w-5xl mx-auto w-full px-6 flex-1 flex flex-col gap-4 justify-center">
        {courses.map((c) => (
          <CourseCard key={c.course.course_id} state={c} now={now} />
        ))}
      </main>

      <ControlBar
        version={VERSION}
        synced={synced}
        offsetMs={offsetMs}
        muted={audio.muted}
        onToggleMute={() => audio.engine.setMuted(!audio.muted)}
        onTestSound={() => void audio.engine.test()}
        onShowSlides={() => setSlides("manual")}
        onShowSeating={layout ? () => setSeatingOverride(true) : null}
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

      {showSeating && layout && (
        <SeatingOverlay layout={layout} now={now} schedule={schedule} phase={phase} autoMode={seatingOverride === null} onClose={() => setSeatingOverride(false)} />
      )}
      {showSlides && <InstructionSlides schedule={schedule} onClose={() => setSlides(null)} />}
      <AlertCenter alerts={alerts} onDismiss={dismissAlert} />
      {!audio.unlocked && <AudioUnlockGate roomCode={schedule.room_code} onUnlock={() => void audio.engine.unlock()} />}
    </div>
  );
}
