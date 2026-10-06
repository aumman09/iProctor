type Status = "active" | "offline" | "simulation";

const STATUS: Record<Status, { label: string; cls: string; dot: string }> = {
  active: { label: "ACTIVE", cls: "bg-emerald-50 text-emerald-600 border-emerald-200/60", dot: "bg-emerald-500 animate-pulse" },
  offline: { label: "OFFLINE CACHE", cls: "bg-amber-50 text-amber-600 border-amber-200/60", dot: "bg-amber-500" },
  simulation: { label: "SIMULATION", cls: "bg-indigo-50 text-indigo-600 border-indigo-200/60", dot: "bg-indigo-500 animate-pulse" },
};

export function Header({ roomCode, status }: { roomCode: string; status: Status }) {
  const s = STATUS[status];
  return (
    <header className="max-w-6xl mx-auto w-full pt-8 pb-4 px-6 md:px-8 flex justify-between items-center gap-4">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-2xl bg-slate-950 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-md">
          iP
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-slate-950">
              iProctor <span className="text-rose-600 font-extrabold">MFU</span>
            </h1>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              {s.label}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Intelligent Exam Hall Controller</p>
        </div>
      </div>

      <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-slate-200/80 bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] text-xs font-semibold">
        <span className="text-slate-400 font-normal">Room</span>
        <span className="text-sm lg:text-lg font-bold text-slate-950">{roomCode}</span>
      </div>
    </header>
  );
}
