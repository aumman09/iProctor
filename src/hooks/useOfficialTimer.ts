"use client";

import { useEffect, useState } from "react";
import { TIMING } from "@/lib/config";
import { readCache, writeCache } from "@/lib/cache";
import type { ServerTime } from "@/lib/types";

/** โหมดจำลองเวลา (สำหรับทดสอบ/ซ้อม) */
export interface SimClock {
  /** เวลาจำลอง ณ จุดเริ่ม (epoch ms) */
  startAt: number;
  /** Date.now() จริง ณ จุดเริ่ม */
  realStart: number;
  speed: number;
}

const OFFSET_KEY = "time-offset";

/** วัด offset ระหว่างนาฬิกาเครื่องกับเซิร์ฟเวอร์ (ชดเชย latency ครึ่งหนึ่งของ round-trip) */
async function measureOffset(): Promise<number> {
  const t0 = Date.now();
  const res = await fetch("/api/v1/time", { cache: "no-store" });
  const t1 = Date.now();
  if (!res.ok) throw new Error(`time sync failed: ${res.status}`);
  const { epoch_ms } = (await res.json()) as ServerTime;
  return epoch_ms + (t1 - t0) / 2 - t1;
}

/**
 * นาฬิกาทางการของระบบ: tick จาก Web Worker + offset จากเซิร์ฟเวอร์
 * คืนค่า now = null จนกว่า tick แรกจะมาถึง (กัน hydration mismatch)
 */
export function useOfficialTimer(sim: SimClock | null) {
  const [tick, setTick] = useState<number | null>(null);
  const [offset, setOffset] = useState(() => readCache<number>(OFFSET_KEY) ?? 0);
  const [synced, setSynced] = useState(false);

  // ซิงก์เวลากับเซิร์ฟเวอร์เป็นระยะ ๆ (ถ้า offline ใช้ค่าล่าสุดที่ cache ไว้)
  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      try {
        const o = await measureOffset();
        if (cancelled) return;
        setOffset(o);
        setSynced(true);
        writeCache(OFFSET_KEY, o);
      } catch {
        if (!cancelled) setSynced(false);
      }
    };
    void sync();
    const id = setInterval(sync, TIMING.resyncEveryMin * 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Tick จาก Web Worker (fallback เป็น setInterval ถ้าสร้าง Worker ไม่ได้)
  const intervalMs = sim ? Math.max(50, Math.round(1000 / sim.speed)) : 1000;
  useEffect(() => {
    let worker: Worker | null = null;
    let fallback: ReturnType<typeof setInterval> | null = null;
    try {
      worker = new Worker(new URL("../workers/timer.worker.ts", import.meta.url));
      worker.onmessage = (e: MessageEvent<number>) => setTick(e.data);
      worker.postMessage({ type: "start", intervalMs });
    } catch {
      fallback = setInterval(() => setTick(Date.now()), intervalMs);
    }
    return () => {
      worker?.terminate();
      if (fallback) clearInterval(fallback);
    };
  }, [intervalMs]);

  let now: number | null = null;
  if (tick !== null) now = sim ? sim.startAt + (tick - sim.realStart) * sim.speed : tick + offset;

  return { now, offsetMs: offset, synced, simulated: sim !== null };
}
