import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ChevronDown, Clock, LayoutDashboard, LayoutGrid, LogOut, MapPin, MonitorPlay, Search } from "lucide-react";
import { logout } from "../login/actions";
import { getCurrentUser } from "@/lib/server/auth";
import { logUsage } from "@/lib/server/usage";
import { getExamPeriods, getProctorDuties } from "@/lib/server/data-source";
import type { DutyStatus, ProctorDuty } from "@/lib/types";
import { AddToCalendarButton } from "@/components/AddToCalendarButton";
import { SEAT_THEME } from "@/components/seat-theme";
import { SiteFooter } from "@/components/SiteFooter";

// โทนกลาง (slate) ทั้งหน้า ใช้เขียว (emerald) เฉพาะสิ่งที่ "เปิดอยู่ตอนนี้" เท่านั้น
const STATUS: Record<DutyStatus, { label: string; cls: string; dot: string }> = {
  UPCOMING: { label: "Upcoming", cls: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  LIVE: { label: "In session", cls: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500 animate-pulse" },
  COMPLETED: { label: "Completed", cls: "bg-slate-100 text-slate-400", dot: "bg-slate-300" },
};

const SESSION_LABEL = { morning: "Morning session", afternoon: "Afternoon session" } as const;

const dateParts = (d: string) => {
  const date = new Date(`${d}T00:00:00Z`);
  const fmt = (o: Intl.DateTimeFormatOptions) => date.toLocaleDateString("en-GB", { timeZone: "UTC", ...o });
  return { day: fmt({ day: "numeric" }), month: fmt({ month: "short" }), weekday: fmt({ weekday: "short" }) };
};

// FR-02: Proctor Portal / My Duty Dashboard
export default async function PortalPage(props: PageProps<"/portal">) {
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  void logUsage("PORTAL_VIEW", { staffId: user.staff_id });

  const sp = await props.searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const periods = await getExamPeriods();
  const period = periods.labels.find((p) => p === one(sp.period)) ?? periods.current;
  const room = one(sp.room) ?? "";

  const duties = await getProctorDuties(user, { period, roomQuery: room });
  const live = duties.filter((d) => d.canLaunch);
  const upcoming = duties.filter((d) => !d.canLaunch && d.status !== "COMPLETED");
  const past = duties.filter((d) => !d.canLaunch && d.status === "COMPLETED");

  return (
    <div className="flex min-h-screen flex-col">
      <main className="max-w-3xl mx-auto w-full flex-1 px-4 py-8 sm:px-6">
        <header className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              iProctor <span className="text-rose-600">MFU</span>
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Proctor schedule · {user.name} ({user.role === "admin" ? "Admin" : "Proctor"})
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {user.role === "admin" && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                <LayoutDashboard className="w-4 h-4" />
                Admin Panel
              </Link>
            )}
            <form action={logout}>
              <button className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </form>
          </div>
        </header>

        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-900">{duties.length}</span> proctoring duties
          </p>
          <AddToCalendarButton count={upcoming.length + live.length} />
        </div>

        <form method="get" className="flex flex-wrap gap-2 mb-8 rounded-2xl border border-slate-200 bg-white p-2">
          <select
            name="period"
            defaultValue={period}
            className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            {periods.labels.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              name="room"
              defaultValue={room}
              placeholder="Search room, e.g. C3 107 (when covering for someone)"
              className="w-full rounded-xl pl-9 pr-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:bg-slate-50"
            />
          </div>
          <button className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200">Search</button>
        </form>

        {duties.length === 0 && <p className="text-center text-slate-400 py-12">No proctoring duties found</p>}

        {live.length > 0 && (
          <Section title="Now">
            <ul className="space-y-3">{live.map(renderDuty)}</ul>
          </Section>
        )}

        {upcoming.length > 0 && (
          <Section title="Upcoming">
            <ul className="space-y-3">{upcoming.map(renderDuty)}</ul>
          </Section>
        )}

        {past.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer select-none list-none inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
              Past duties ({past.length})
              <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
            </summary>
            <ul className="space-y-3 mt-3 opacity-70">{past.map(renderDuty)}</ul>
          </details>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">{title}</h2>
      {children}
    </section>
  );
}

function renderDuty(d: ProctorDuty) {
  const { day, month, weekday } = dateParts(d.date);
  const status = STATUS[d.status];
  return (
    <li
      key={d.dutyId}
      className={`flex gap-4 rounded-2xl border bg-white p-4 sm:p-5 ${d.canLaunch ? "border-emerald-200 shadow-sm shadow-emerald-100" : "border-slate-200"}`}
    >
      <div className="flex w-14 flex-shrink-0 flex-col items-center justify-center self-start rounded-xl bg-slate-50 py-2">
        <span className="text-[11px] text-slate-500">{month}</span>
        <span className="text-2xl font-bold leading-tight text-slate-900 font-num">{day}</span>
        <span className="text-[11px] text-slate-400">{weekday}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-semibold text-slate-900">{SESSION_LABEL[d.session]}</div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.cls}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="font-num">{d.sessionTime}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-slate-400" />
            Building {d.building} · Room {d.roomNumber}
          </span>
        </div>

        <ul className="mt-3 flex flex-wrap gap-2">
          {d.coursesSummary.map((c) => (
            <li
              key={c.courseCode}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600"
            >
              <span className={`h-2 w-2 rounded-full ${SEAT_THEME[c.seatColorTheme].dot}`} />
              {c.courseName}
              {c.rowLabel && <span className="text-slate-400">· Seat {c.rowLabel}</span>}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap gap-2">
          {d.canLaunch && (
            <Link
              href={`/room/${d.roomId}?session=${d.session}`}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <MonitorPlay className="w-4 h-4" />
              Launch exam screen
            </Link>
          )}
          <Link
            href={`/seating/${d.roomId}`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <LayoutGrid className="w-4 h-4 text-slate-400" />
            Seating plan
          </Link>
        </div>
      </div>
    </li>
  );
}
