"use client";

import { useCallback, useState } from "react";
import { readCache, writeCache } from "@/lib/cache";

export interface ProctorNote {
  text: string;
  /** แสดงบนจอหรือซ่อนไว้ (ข้อความยังอยู่) */
  visible: boolean;
  /** epoch ms (เวลาทางการ) ที่แก้ล่าสุด */
  updatedAt: number | null;
}

const EMPTY: ProctorNote = { text: "", visible: false, updatedAt: null };

/** FR-05.4 Live Proctor Notes — เก็บในเครื่องฉาย (localStorage) แยกตามห้อง/วันที่/รอบสอบ ไม่หายเมื่อรีเฟรช */
export function useProctorNotes(key: string) {
  const storageKey = `notes:${key}`;
  // ใช้ใน RoomController ซึ่ง render ฝั่ง client เท่านั้น (RoomScreen) จึงอ่าน localStorage ตอนสร้าง state ได้เลย
  // key คงที่ตลอดอายุหน้าจอ (ห้อง/วัน/รอบมาจาก URL)
  const [note, setNote] = useState<ProctorNote>(() => readCache<ProctorNote>(storageKey) ?? EMPTY);

  const save = useCallback(
    (next: ProctorNote) => {
      setNote(next);
      writeCache(storageKey, next);
    },
    [storageKey],
  );

  return { note, save };
}
