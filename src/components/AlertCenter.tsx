"use client";

import { useEffect, useState } from "react";
import { DoorOpen, Info, OctagonX, TriangleAlert, type LucideIcon } from "lucide-react";

export type AlertKind = "info" | "departure" | "warning" | "end";

export interface Alert {
  id: string;
  kind: AlertKind;
  title: string;
  description: string;
  /** modal = ต้องกดปิด, toast = แสดงมุมบนแล้วหายเอง (ไม่รบกวนรายวิชาอื่น) */
  variant: "modal" | "toast";
  /** modal ที่ปิดเองหลังเวลานี้ (ms) เช่น ครบ 45 นาที — ไม่ระบุ = ค้างจนกดปิด */
  autoDismissMs?: number;
}

const KIND: Record<AlertKind, { icon: LucideIcon; cls: string }> = {
  info: { icon: Info, cls: "bg-sky-50 text-sky-600 border-sky-100" },
  departure: { icon: DoorOpen, cls: "bg-indigo-50 text-indigo-600 border-indigo-100" },
  warning: { icon: TriangleAlert, cls: "bg-amber-50 text-amber-600 border-amber-100" },
  end: { icon: OctagonX, cls: "bg-rose-50 text-rose-600 border-rose-100" },
};

const TOAST_MS = 20_000;

export function AlertCenter({ alerts, onDismiss }: { alerts: Alert[]; onDismiss: (id: string) => void }) {
  const modal = alerts.find((a) => a.variant === "modal");
  const toasts = alerts.filter((a) => a.variant === "toast");

  return (
    <>
      <div className="fixed top-6 right-6 z-40 flex flex-col gap-3 w-[min(420px,calc(100vw-3rem))]">
        {toasts.map((t) => (
          <Toast key={t.id} alert={t} onDismiss={onDismiss} />
        ))}
      </div>

      {modal && <Modal key={modal.id} alert={modal} onDismiss={onDismiss} />}
    </>
  );
}

function Modal({ alert, onDismiss }: { alert: Alert; onDismiss: (id: string) => void }) {
  // ปิดเองตาม autoDismissMs พร้อมนับถอยหลังบนปุ่ม
  const [left, setLeft] = useState(alert.autoDismissMs ? Math.ceil(alert.autoDismissMs / 1000) : null);
  useEffect(() => {
    if (!alert.autoDismissMs) return;
    const startedAt = Date.now();
    const id = setInterval(() => {
      const remain = Math.ceil((alert.autoDismissMs! - (Date.now() - startedAt)) / 1000);
      if (remain <= 0) onDismiss(alert.id);
      else setLeft(remain);
    }, 250);
    return () => clearInterval(id);
  }, [alert.autoDismissMs, alert.id, onDismiss]);

  return (
    <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-8 lg:p-12 max-w-2xl w-full text-center shadow-2xl border border-slate-100 animate-[pop_200ms_ease-out]">
        <AlertIcon kind={alert.kind} large />
        <h3 className="text-2xl lg:text-4xl font-bold text-slate-900 mb-3">{alert.title}</h3>
        <p className="text-slate-500 text-base lg:text-xl leading-relaxed mb-8">{alert.description}</p>
        <button
          onClick={() => onDismiss(alert.id)}
          className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-white font-medium rounded-xl text-sm transition shadow-sm"
        >
          Dismiss{left !== null && <span className="ml-1.5 font-num text-slate-400">({left}s)</span>}
        </button>
      </div>
    </div>
  );
}

function AlertIcon({ kind, large = false }: { kind: AlertKind; large?: boolean }) {
  const { icon: Icon, cls } = KIND[kind];
  return (
    <div
      className={`${large ? "w-16 h-16 lg:w-20 lg:h-20 mx-auto mb-5" : "w-10 h-10"} rounded-2xl border flex items-center justify-center flex-shrink-0 ${cls}`}
    >
      <Icon className={large ? "w-8 h-8 lg:w-10 lg:h-10" : "w-5 h-5"} />
    </div>
  );
}

function Toast({ alert, onDismiss }: { alert: Alert; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const id = setTimeout(() => onDismiss(alert.id), TOAST_MS);
    return () => clearTimeout(id);
  }, [alert.id, onDismiss]);

  return (
    <button
      onClick={() => onDismiss(alert.id)}
      className="text-left flex gap-3 items-start bg-white rounded-2xl p-4 shadow-xl border border-slate-100 animate-[pop_200ms_ease-out]"
    >
      <AlertIcon kind={alert.kind} />
      <div>
        <p className="font-semibold text-slate-900">{alert.title}</p>
        <p className="text-sm text-slate-500 leading-relaxed">{alert.description}</p>
      </div>
    </button>
  );
}
