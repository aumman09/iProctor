"use client";

import { useEffect, useState } from "react";
import { readCache, writeCache } from "@/lib/cache";
import type { RoomLayoutResponse } from "@/lib/types";

/** ดึงผังที่นั่งห้อง — ถ้าเครือข่ายล่มใช้ค่าที่ cache ไว้ล่าสุด */
export function useRoomLayout(roomId: string) {
  const [layout, setLayout] = useState<RoomLayoutResponse | null>(null);

  useEffect(() => {
    const key = `layout:${roomId}`;
    const ctrl = new AbortController();
    fetch(`/api/v1/exam-rooms/${encodeURIComponent(roomId)}/seating`, { signal: ctrl.signal, cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<RoomLayoutResponse>) : Promise.reject(new Error(String(r.status)))))
      .then((l) => {
        writeCache(key, l);
        setLayout(l);
      })
      .catch(() => {
        if (ctrl.signal.aborted) return;
        // cache รูปแบบเก่า (rowLabels/columns) ใช้กับ SeatingChart ปัจจุบันไม่ได้ — ข้ามไป
        const cached = readCache<RoomLayoutResponse>(key);
        setLayout(Array.isArray(cached?.rows) ? cached : null);
      });
    return () => ctrl.abort();
  }, [roomId]);

  return layout;
}
