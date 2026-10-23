"use client";

import { Volume2 } from "lucide-react";

/**
 * Browser บล็อกเสียงอัตโนมัติจนกว่าผู้ใช้จะคลิก
 * หน้านี้บังคับให้กรรมการคลิก 1 ครั้งก่อนเริ่ม เพื่อ unlock AudioContext ไว้ตลอดการสอบ
 */
export function AudioUnlockGate({ roomCode, onUnlock }: { roomCode: string; onUnlock: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-[#FBFBFD]/95 backdrop-blur flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-slate-950 text-white flex items-center justify-center shadow-lg">
          <Volume2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Ready to start · Room {roomCode}</h2>
        <p className="text-slate-700 text-sm mt-2 leading-relaxed">
          Click the button below to enable automatic announcements.
          <br />
          (Click once to enable automatic announcements)
        </p>
        <button
          onClick={onUnlock}
          className="mt-8 w-full py-3.5 bg-slate-950 hover:bg-slate-800 text-white font-semibold rounded-2xl transition shadow-md"
        >
          Start
        </button>
      </div>
    </div>
  );
}
