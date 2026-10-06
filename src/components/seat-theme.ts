import type { CourseStatus, SeatColorTheme } from "@/lib/types";

/** สีป้ายแถวบนจอ ให้ตรงกับป้ายกระดาษจริงในห้องสอบ (PRD §3.1) */
export const SEAT_THEME: Record<SeatColorTheme, { badge: string; text: string; pill: string; dot: string }> = {
  pink: {
    badge: "bg-rose-50 text-rose-600 border-rose-100",
    text: "text-rose-600",
    pill: "bg-rose-50 text-rose-600 border-rose-100",
    dot: "bg-rose-400",
  },
  white: {
    badge: "bg-slate-50 text-slate-700 border-slate-200",
    text: "text-slate-600",
    pill: "bg-slate-100 text-slate-600 border-slate-200/70",
    dot: "bg-white ring-1 ring-slate-300",
  },
  blue: {
    badge: "bg-sky-50 text-sky-600 border-sky-100",
    text: "text-sky-600",
    pill: "bg-sky-50 text-sky-600 border-sky-100",
    dot: "bg-sky-400",
  },
  green: {
    badge: "bg-emerald-50 text-emerald-600 border-emerald-100",
    text: "text-emerald-600",
    pill: "bg-emerald-50 text-emerald-600 border-emerald-100",
    dot: "bg-emerald-400",
  },
  yellow: {
    badge: "bg-amber-50 text-amber-600 border-amber-100",
    text: "text-amber-600",
    pill: "bg-amber-50 text-amber-600 border-amber-100",
    dot: "bg-amber-400",
  },
};

export const STATUS_STYLE: Record<CourseStatus, { card: string; timer: string; label: string }> = {
  upcoming: { card: "border-slate-100", timer: "text-slate-400", label: "Starts in" },
  running: { card: "border-slate-100", timer: "text-slate-900", label: "Remaining" },
  warning: { card: "border-amber-200 ring-4 ring-amber-100/60", timer: "text-amber-500 animate-pulse", label: "Remaining" },
  ended: { card: "border-rose-100 bg-rose-50/30", timer: "text-rose-500", label: "Time's up" },
};
