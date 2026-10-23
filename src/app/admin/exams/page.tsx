import Link from "next/link";
import { LayoutGrid, MonitorPlay, Search, UserRound } from "lucide-react";
import { setCompletionByAdmin } from "../actions";
import { CourseNoteForm } from "@/components/admin/CourseNoteForm";
import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { Card, PageHeader, ScreenLight, StatusChip } from "@/components/admin/ui";
import { SEAT_THEME } from "@/components/seat-theme";
import { bangkokSessionNow, bangkokToday, getCourseRoomCounts, getExamOverview } from "@/lib/server/admin";
import { getExamPeriods } from "@/lib/server/data-source";
import type { SessionName } from "@/lib/types";

const SESSION = { morning: "Morning", afternoon: "Afternoon" } as const;
const thaiDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short", year: "numeric" });
const time = (d: Date) => d.toLocaleTimeString("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });

export default async function AdminExams(props: PageProps<"/admin/exams">) {
  const sp = await props.searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  const periods = await getExamPeriods();
  const period = periods.labels.find((p) => p === one(sp.period)) ?? periods.current;
  // ไม่มีพารามิเตอร์ (เปิดหน้าครั้งแรก / Clear) = วันนี้ + รอบสอบ ณ ตอนนี้; ส่งค่าว่าง = ทุกวัน / ทุกรอบ
  const date = sp.date === undefined ? bangkokToday() : one(sp.date)?.match(/^\d{4}-\d{2}-\d{2}$/) ? one(sp.date) : undefined;
  const sessionParam = sp.session === undefined ? bangkokSessionNow() : one(sp.session);
  const session = sessionParam === "morning" || sessionParam === "afternoon" ? (sessionParam as SessionName) : undefined;
  const status = one(sp.status) === "done" || one(sp.status) === "pending" ? (one(sp.status) as "done" | "pending") : undefined;
  const q = one(sp.q);

  const [slots, roomCounts] = await Promise.all([getExamOverview({ period, date, session, status, q }), getCourseRoomCounts(period)]);
  const courseCount = slots.reduce((n, s) => n + s.courses.length, 0);
  const field = "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm";

  return (
    <>
      <AutoRefresh />
      <PageHeader
        title="Exam Schedule"
        sub="Exam Screen Status (Green = Active) · Course Submission and Extra Note · Refresh Every 30 Seconds"
      />

      <form method="get" className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
        <select name="period" defaultValue={period} className={field}>
          {periods.labels.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <input type="date" name="date" defaultValue={date} className={field} />
        <select name="session" defaultValue={session ?? ""} className={field}>
          <option value="">All Sessions</option>
          <option value="morning">Morning</option>
          <option value="afternoon">Afternoon</option>
        </select>
        <select name="status" defaultValue={status ?? ""} className={field}>
          <option value="">All Statuses</option>
          <option value="pending">Not Submitted</option>
          <option value="done">Submitted</option>
        </select>
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input name="q" defaultValue={q} placeholder="Room, Course Code or Course Name" className={`${field} w-full pl-9`} />
        </div>
        <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">Filter</button>
        <Link href="/admin/exams" className="px-2 text-sm text-slate-500 hover:text-slate-900">
          Clear
        </Link>
      </form>

      <p className="mb-3 text-sm text-slate-500">
        {slots.length} {slots.length === 1 ? "Session" : "Sessions"} · {courseCount} {courseCount === 1 ? "Course" : "Courses"}
      </p>

      {slots.length === 0 ? (
        <Card>
          <p className="py-10 text-center text-sm text-slate-400">No exam sessions match the filters</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {slots.map((s) => {
            const done = s.courses.filter((c) => c.completedAt).length;
            return (
              <section key={s.slotId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="text-base font-bold text-slate-900">
                      {s.building} {s.roomNumber}
                    </span>
                    <span className="text-sm text-slate-600">
                      {thaiDate(s.date)} · {SESSION[s.session]}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <UserRound className="h-3.5 w-3.5" />
                      {s.proctors.map((p) => `${p.name}${p.role === "HEAD" ? " (Head)" : ""}`).join(", ") || "No Proctor Assigned"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ScreenLight screen={s.screen} />
                    <StatusChip done={done === s.courses.length}>
                      Submitted {done}/{s.courses.length}
                    </StatusChip>
                    <Link
                      href={`/seating/${s.roomId}`}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" /> Seating
                    </Link>
                    <Link
                      href={`/room/${s.roomId}?date=${s.date}&session=${s.session}`}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    >
                      <MonitorPlay className="h-3.5 w-3.5" /> Exam Screen
                    </Link>
                  </div>
                </header>

                <ul className="divide-y divide-slate-100">
                  {s.courses.map((c) => (
                    <li key={c.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] lg:items-start">
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border text-sm font-bold ${SEAT_THEME[c.seatColor].badge}`}
                        >
                          {c.seatGroup || "•"}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">
                            <span className="font-num text-slate-400">{c.courseCode}</span> {c.courseName}
                          </p>
                          <p className="font-num text-xs text-slate-500">
                            Sec {c.section} · {c.startTime.slice(0, 5)}–{c.endTime.slice(0, 5)}
                          </p>
                        </div>
                      </div>

                      <CourseNoteForm slotCourseId={c.id} note={c.adminNote} courseCode={c.courseCode} roomCount={roomCounts[c.courseCode] ?? 1} />

                      <form action={setCompletionByAdmin} className="flex items-center gap-2 lg:justify-end">
                        <input type="hidden" name="slotCourseId" value={c.id} />
                        <input type="hidden" name="completed" value={c.completedAt ? "false" : "true"} />
                        {c.completedAt ? (
                          <>
                            <StatusChip done>
                              Submitted {time(c.completedAt)}
                              {c.completedByName && ` · ${c.completedByName}`}
                            </StatusChip>
                            <button className="text-xs text-slate-400 underline hover:text-slate-700">Undo</button>
                          </>
                        ) : (
                          <>
                            <StatusChip done={false}>Not Submitted</StatusChip>
                            <button className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                              Mark as Submitted
                            </button>
                          </>
                        )}
                      </form>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
