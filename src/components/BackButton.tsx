"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

/** ย้อนกลับหน้าก่อนหน้า ถ้าไม่มีประวัติ (เปิดตรง ๆ) ไปที่ fallback */
export function BackButton({ fallback = "/portal", label = "ย้อนกลับ" }: { fallback?: string; label?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200/80 bg-white hover:bg-slate-50 text-sm font-medium text-slate-600 shadow-sm"
    >
      <ArrowLeft className="w-4 h-4" /> {label}
    </button>
  );
}
