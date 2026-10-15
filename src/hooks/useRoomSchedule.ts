"use client";

import { useEffect, useState } from "react";
import { readCache, writeCache } from "@/lib/cache";
import type { RoomSchedule, SessionName } from "@/lib/types";

type Source = "network" | "cache";

interface State {
  schedule: RoomSchedule | null;
  source: Source | null;
  error: string | null;
}

/** ดึงตารางสอบของห้อง — ถ้าเครือข่ายล่มจะใช้ข้อมูลที่ cache ไว้ล่าสุด */
export function useRoomSchedule(roomId: string, date: string | null, session: SessionName | null, demo = false) {
  const [state, setState] = useState<State>({ schedule: null, source: null, error: null });

  useEffect(() => {
    if (!date || !session) return;
    const key = `schedule:${roomId}:${date}:${session}`;
    const ctrl = new AbortController();

    (async () => {
      try {
        const url = `/api/v1/exam-rooms/${encodeURIComponent(roomId)}/schedule?date=${date}&session=${session}${demo ? "&demo=1" : ""}`;
        const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
        if (!res.ok) throw new Error(res.status === 404 ? "Exam room not found" : `HTTP ${res.status}`);
        const schedule = (await res.json()) as RoomSchedule;
        writeCache(key, schedule);
        setState({ schedule, source: "network", error: null });
      } catch (err) {
        if (ctrl.signal.aborted) return;
        const cached = readCache<RoomSchedule>(key);
        const message = err instanceof Error ? err.message : String(err);
        setState(cached ? { schedule: cached, source: "cache", error: message } : { schedule: null, source: null, error: message });
      }
    })();

    return () => ctrl.abort();
  }, [roomId, date, session, demo]);

  return state;
}
