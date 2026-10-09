"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** โหลดข้อมูลหน้าใหม่ทุก ๆ N วินาที (ไฟสถานะหน้าจอคุมสอบ / สถานะส่งข้อสอบ) — หยุดเมื่อแท็บถูกซ่อน */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => document.visibilityState === "visible" && router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
