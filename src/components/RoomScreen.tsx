"use client";

import dynamic from "next/dynamic";

// นาฬิกาและวัน/รอบสอบต้องอิงเวลาเครื่องในห้องสอบ → ปิด SSR เพื่อไม่ให้ค่าจากเซิร์ฟเวอร์ (คนละ timezone) ไป hydrate ผิด
export const RoomScreen = dynamic(() => import("./RoomController").then((m) => m.RoomController), {
  ssr: false,
  loading: () => <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">กำลังเริ่มระบบ…</div>,
});
