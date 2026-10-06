"use client";

import { useEffect, useMemo, useRef } from "react";
import { TIMING } from "@/lib/config";
import { readCache, writeCache } from "@/lib/cache";
import { buildTimeline, getCourseStates, getRoomPhase } from "@/lib/schedule-engine";
import type { ExamEvent, RoomSchedule } from "@/lib/types";

/**
 * ขับเคลื่อนไทม์ไลน์ของห้องสอบ: คำนวณสถานะรายวิชา/สถานะห้อง และยิง event ตามเวลา
 * - แต่ละ event ยิงครั้งเดียว (จำไว้ใน localStorage ด้วย persistKey — รีโหลดหน้าแล้วไม่ประกาศซ้ำ)
 * - event ที่เลยเวลามานานกว่า eventGraceSec จะถูกข้าม (เปิดหน้าช้า ไม่ประกาศย้อนหลัง)
 * - persistKey = null (โหมดจำลอง) จะไม่บันทึก และรีเซ็ตเมื่อเวลาถูกย้อนกลับ
 */
export function useExamEngine(
  schedule: RoomSchedule | null,
  now: number | null,
  persistKey: string | null,
  onEvent: (ev: ExamEvent) => void,
) {
  const timeline = useMemo(() => (schedule ? buildTimeline(schedule) : []), [schedule]);
  const firedRef = useRef<{ key: string | null; ids: Set<string> } | null>(null);
  const lastNowRef = useRef<number | null>(null);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!schedule || now === null) return;

    if (!firedRef.current || firedRef.current.key !== persistKey) {
      const saved = persistKey ? readCache<string[]>(`fired:${persistKey}`) : null;
      firedRef.current = { key: persistKey, ids: new Set(saved ?? []) };
      lastNowRef.current = null;
    }
    const fired = firedRef.current.ids;

    // เวลาถูกย้อนกลับ (เช่น กระโดดเวลาในโหมดจำลอง) → ปลดล็อก event ที่ยังไม่ถึงเวลา
    if (lastNowRef.current !== null && now < lastNowRef.current - 2000) {
      for (const ev of timeline) if (ev.at > now) fired.delete(ev.id);
    }
    lastNowRef.current = now;

    const due: ExamEvent[] = [];
    for (const ev of timeline) {
      if (fired.has(ev.id) || now < ev.at) continue;
      fired.add(ev.id);
      if (now - ev.at <= TIMING.eventGraceSec * 1000) due.push(ev);
    }
    if (due.length === 0) return;
    if (persistKey) writeCache(`fired:${persistKey}`, [...fired]);
    due.forEach((ev) => onEventRef.current(ev));
  }, [now, schedule, timeline, persistKey]);

  const courses = useMemo(() => (schedule && now !== null ? getCourseStates(schedule, now) : []), [schedule, now]);
  const phase = schedule && now !== null ? getRoomPhase(schedule, courses, now) : null;
  const nextEvent = now !== null ? (timeline.find((ev) => ev.at > now) ?? null) : null;

  return { timeline, courses, phase, nextEvent };
}
