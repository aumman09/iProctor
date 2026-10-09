import Link from "next/link";
import { Activity, CalendarCheck, CheckCheck, DoorOpen, MonitorPlay, Users } from "lucide-react";
import { Card, DailyBars, PageHeader, StatTile, StatusChip } from "@/components/admin/ui";
import { SEAT_THEME } from "@/components/seat-theme";
import { bangkokToday, getCompletionStats, getRecentActivity, getUsageSummary } from "@/lib/server/admin";
import { getExamPeriods } from "@/lib/server/data-source";

const SESSION = { morning: "รอบเช้า", afternoon: "รอบบ่าย" } as const;
const ACTIVITY: Record<string, string> = {
  COURSE_COMPLETED: "ยืนยันสอบเสร็จ",
  COURSE_REOPENED: "ยกเลิกสถานะสอบเสร็จ",
  NOTE_UPDATED: "แก้ข้อกำหนดรายวิชา",
  SETTINGS_UPDATED: "แก้เวลาแจ้งเตือน",
  LOGIN: "เข้าสู่ระบบ",
};
const thaiDay = (d: string, o: Intl.DateTimeFormatOptions) => new Date(`${d}T00:00:00Z`).toLocaleDateString("th-TH", { timeZone: "UTC", ...o });
const time = (d: Date) => d.toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });

export default async function AdminDashboard(props: PageProps<"/admin">) {
  const sp = await props.searchParams;
  const periods = await getExamPeriods();
  const period = periods.labels.find((p) => p === sp.period) ?? periods.current;
  const [stats, usage, activity] = await Promise.all([getCompletionStats(period), getUsageSummary(), getRecentActivity()]);
  const today = bangkokToday();
  const pct = stats.courses ? stats.coursesDone / stats.courses : 0;

  return (
    <>
      <PageHeader
        title="ภาพรวม"
        sub={`${thaiDay(today, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · ${period ?? "ยังไม่มีช่วงสอบ"}`}
        actions={
          <form method="get" className="flex gap-2">
            <select name="period" defaultValue={period} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              {periods.labels.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">ดู</button>
          </form>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={CheckCheck}
          label="รายวิชาส่งข้อสอบแล้ว"
          value={
            <>
              {stats.coursesDone}
              <span className="text-lg font-medium text-slate-400"> / {stats.courses}</span>
            </>
          }
          progress={pct}
          sub={`${Math.round(pct * 100)}% ของช่วงสอบนี้`}
        />
        <StatTile
          icon={DoorOpen}
          label="รอบสอบที่ส่งครบทุกวิชา"
          value={
            <>
              {stats.slotsDone}
              <span className="text-lg font-medium text-slate-400"> / {stats.slots}</span>
            </>
          }
          sub={`ใช้ห้องสอบ ${stats.rooms} ห้อง`}
        />
        <StatTile icon={MonitorPlay} label="เปิดหน้าจอคุมสอบวันนี้" value={usage.today.roomOpens} sub={`ดูผังที่นั่ง ${usage.today.seatingViews} ครั้ง`} />
        <StatTile icon={Users} label="ผู้ใช้งาน 7 วันล่าสุด" value={usage.activeUsers7d} sub={`เข้าสู่ระบบวันนี้ ${usage.today.logins} ครั้ง`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card
          className="lg:col-span-3"
          title="รอบสอบวันนี้"
          sub="สถานะจากการกด “Mark as completed” ในหน้าจอคุมสอบ"
          action={
            <Link href={`/admin/exams?date=${today}`} className="text-sm font-medium text-slate-600 hover:text-slate-900">
              ดูทั้งหมด →
            </Link>
          }
        >
          {stats.todaySlots.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">วันนี้ไม่มีรอบสอบในช่วงสอบนี้</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {stats.todaySlots.map((s) => {
                const done = s.courses.filter((c) => c.completedAt).length;
                return (
                  <li key={s.slotId} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                    <div className="w-28 flex-shrink-0">
                      <p className="font-semibold text-slate-900">
                        {s.building} {s.roomNumber}
                      </p>
                      <p className="text-xs text-slate-500">{SESSION[s.session]}</p>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                      {s.courses.map((c) => (
                        <span key={c.id} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600">
                          <span className={`h-2 w-2 rounded-full ${SEAT_THEME[c.seatColor].dot}`} />
                          {c.courseCode}
                          <StatusChip done={!!c.completedAt}>{c.completedAt ? time(c.completedAt) : "รอ"}</StatusChip>
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
          <Card title="การใช้งานรายวัน" sub="เข้าสู่ระบบ · ตารางคุมสอบ · หน้าจอคุมสอบ · ผังที่นั่ง (7 วัน)">
            <DailyBars
              data={usage.daily.map((d) => ({
                label: thaiDay(d.date, { weekday: "short" }),
                value: d.count,
                title: thaiDay(d.date, { day: "numeric", month: "short" }),
              }))}
            />
          </Card>

          <Card title="กิจกรรมล่าสุด">
            {activity.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">ยังไม่มีกิจกรรม</p>
            ) : (
              <ul className="space-y-3">
                {activity.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 text-sm">
                    <Activity className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-300" />
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-700">
                        <span className="font-medium text-slate-900">{a.name ?? "ไม่ระบุ"}</span> · {ACTIVITY[a.type] ?? a.type}
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
        <CalendarCheck className="h-3.5 w-3.5" /> นับ “ส่งข้อสอบแล้ว” เมื่อผู้คุมสอบกดยืนยันในหน้าจอคุมสอบ หรือ Admin ทำเครื่องหมายในหน้า “รอบสอบ & รายวิชา”
      </p>
    </>
  );
}
