import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Card({ title, sub, action, children, className = "" }: { title?: string; sub?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="font-semibold text-slate-900">{title}</h2>}
            {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** ตัวเลขสรุป (hero number) — progress = 0..1 แสดงแถบความคืบหน้าใต้ตัวเลข */
export function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  progress,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  progress?: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Icon className="h-4 w-4 text-slate-400" /> {label}
      </div>
      <p className="mt-2 font-num text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      {progress !== undefined && (
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
      {sub && <p className="mt-2 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

/** แถบสถานะ: เสร็จ (เขียว + ไอคอน) / รอ — ไม่สื่อด้วยสีอย่างเดียว */
export function StatusChip({ done, children }: { done: boolean; children?: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        done ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
      }`}
    >
      <span aria-hidden>{done ? "✓" : "○"}</span>
      {children ?? (done ? "Submitted" : "Pending")}
    </span>
  );
}

/** กราฟแท่ง 1 ชุดข้อมูล (การใช้งานรายวัน) — hover แสดงค่า, ไม่มี legend (หัวการ์ดบอกชื่อชุดข้อมูล) */
export function DailyBars({ data }: { data: Array<{ label: string; value: number; title: string }> }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <div className="flex h-40 items-end gap-2 border-b border-slate-200" role="img" aria-label="Daily usage">
        {data.map((d) => (
          <div key={d.label} className="group relative flex h-full flex-1 items-end justify-center">
            <div
              className="w-full max-w-10 rounded-t bg-slate-700 transition group-hover:bg-slate-900"
              style={{ height: `${Math.max(d.value ? 3 : 0, (d.value / max) * 100)}%` }}
            />
            <span className="pointer-events-none absolute -top-8 z-10 hidden whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow group-hover:block">
              {d.title}: <span className="font-num font-semibold">{d.value}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {data.map((d) => (
          <span key={d.label} className="flex-1 text-center text-xs text-slate-400">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

const hm = (d: Date) => d.toLocaleTimeString("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });

/** ไฟสถานะหน้าจอคุมสอบ (heartbeat) — ไฟเขียวกะพริบ = กำลังคุมสอบ, เทา = ปิดจอ/ขาดการเชื่อมต่อ; มีข้อความกำกับเสมอ */
export function ScreenLight({
  screen,
  compact = false,
}: {
  screen: { state: "live" | "stale"; openedAt: Date; lastSeenAt: Date; openedBy: string | null } | null;
  compact?: boolean;
}) {
  if (!screen) return null;
  const live = screen.state === "live";
  const title = `Screen opened ${hm(screen.openedAt)}${screen.openedBy ? ` by ${screen.openedBy}` : ""} · last signal ${hm(screen.lastSeenAt)}`;
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        live ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-500"
      }`}
    >
      <span className="relative flex h-2 w-2">
        {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${live ? "bg-emerald-500" : "bg-slate-400"}`} />
      </span>
      {live ? "Proctoring now" : "Screen closed"}
      {!compact && <span className="font-num font-normal opacity-80">· opened {hm(screen.openedAt)}</span>}
    </span>
  );
}
