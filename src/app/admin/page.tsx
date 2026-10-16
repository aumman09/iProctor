import Link from "next/link";
import { Activity, CalendarCheck, CheckCheck, DoorOpen, MonitorPlay, Users } from "lucide-react";
import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { Card, DailyBars, PageHeader, ScreenLight, StatTile, StatusChip } from "@/components/admin/ui";
import { SEAT_THEME } from "@/components/seat-theme";
import { bangkokToday, getCompletionStats, getRecentActivity, getUsageSummary } from "@/lib/server/admin";
import { getExamPeriods } from "@/lib/server/data-source";

const SESSION = { morning: "Morning", afternoon: "Afternoon" } as const;
const ACTIVITY: Record<string, string> = {
  COURSE_COMPLETED: "marked exam completed",
  COURSE_REOPENED: "undid exam completion",
  NOTE_UPDATED: "updated course note",
  SETTINGS_UPDATED: "updated settings",
  LOGIN: "signed in",
};
const thaiDay = (d: string, o: Intl.DateTimeFormatOptions) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", ...o });
const time = (d: Date) => d.toLocaleTimeString("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });

export default async function AdminDashboard(props: PageProps<"/admin">) {
  const sp = await props.searchParams;
  const periods = await getExamPeriods();
  const period = periods.labels.find((p) => p === sp.period) ?? periods.current;
  const [stats, usage, activity] = await Promise.all([getCompletionStats(period), getUsageSummary(), getRecentActivity()]);
  const today = bangkokToday();
  const pct = stats.courses ? stats.coursesDone / stats.courses : 0;

  return (
    <>
      <AutoRefresh />
      <PageHeader
        title="Dashboard"
        sub={`${thaiDay(today, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · ${period ?? "No exam period yet"}`}
        actions={
          <form method="get" className="flex gap-2">
            <select name="period" defaultValue={period} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              {periods.labels.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">View</button>
          </form>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={CheckCheck}
          label="Courses Submitted"
          value={
            <>
              {stats.coursesDone}
              <span className="text-lg font-medium text-slate-400"> / {stats.courses}</span>
            </>
          }
          progress={pct}
          sub={`${Math.round(pct * 100)}% of this exam period`}
        />
        <StatTile
          icon={DoorOpen}
          label="Sessions Fully Submitted"
          value={
            <>
              {stats.slotsDone}
              <span className="text-lg font-medium text-slate-400"> / {stats.slots}</span>
            </>
          }
          sub={`${stats.rooms} exam rooms in use`}
        />
        <StatTile
          icon={MonitorPlay}
          label="Rooms Proctoring Now"
          value={
            <span className="inline-flex items-center gap-2">
              {stats.liveNow > 0 && <span className="h-3 w-3 rounded-full bg-emerald-500" aria-hidden />}
              {stats.liveNow}
            </span>
          }
          sub={`Exam screens opened today: ${usage.today.roomOpens} · seating views: ${usage.today.seatingViews}`}
        />
        <StatTile icon={Users} label="Active Users (7 Days)" value={usage.activeUsers7d} sub={`Sign-ins today: ${usage.today.logins}`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card
          className="lg:col-span-3"
          title="Today's Exam Sessions"
          sub="Status from “Mark as completed” on the exam screen"
          action={
            <Link href={`/admin/exams?date=${today}`} className="text-sm font-medium text-slate-600 hover:text-slate-900">
              View All →
            </Link>
          }
        >
          {stats.todaySlots.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No exam sessions today in this period</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {stats.todaySlots.map((s) => {
                const done = s.courses.filter((c) => c.completedAt).length;
                return (
                  <li key={s.slotId} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                    <div className="w-36 flex-shrink-0">
                      <p className="font-semibold text-slate-900">
                        {s.building} {s.roomNumber}
                      </p>
                      <p className="text-xs text-slate-500">{SESSION[s.session]}</p>
                      <div className="mt-1">
                        <ScreenLight screen={s.screen} compact />
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                      {s.courses.map((c) => (
                        <span key={c.id} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600">
                          <span className={`h-2 w-2 rounded-full ${SEAT_THEME[c.seatColor].dot}`} />
                          {c.courseCode}
                          <StatusChip done={!!c.completedAt}>{c.completedAt ? time(c.completedAt) : "Pending"}</StatusChip>
                        </span>
                      ))}
                    </div>
                    <span className="font-num text-sm font-semibold text-slate-700">
                      {done}/{s.courses.length}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card title="Daily Usage" sub="Sign-ins · portal · exam screens · seating plans (7 days)">
            <DailyBars
              data={usage.daily.map((d) => ({
                label: thaiDay(d.date, { weekday: "short" }),
                value: d.count,
                title: thaiDay(d.date, { day: "numeric", month: "short" }),
              }))}
            />
          </Card>

          <Card title="Recent Activity">
            {activity.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">No activity yet</p>
            ) : (
              <ul className="space-y-3">
                {activity.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 text-sm">
                    <Activity className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-300" />
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-700">
                        <span className="font-medium text-slate-900">{a.name ?? "Unknown"}</span> · {ACTIVITY[a.type] ?? a.type}
                        {typeof a.meta?.courseCode === "string" && <span className="text-slate-500"> {a.meta.courseCode}</span>}
                        {a.roomId && <span className="text-slate-500"> ({a.roomId})</span>}
                      </p>
                    </div>
                    <span className="font-num text-xs text-slate-400">{time(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <p className="mt-6 flex items-center gap-1.5 text-xs text-slate-400">
        <CalendarCheck className="h-3.5 w-3.5" /> A course counts as “submitted” when the proctor confirms it on the exam screen, or an admin marks it on the “Exam Schedule” page.
      </p>
    </>
  );
}
