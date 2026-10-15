"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellRing, CalendarCheck, DoorOpen, LayoutDashboard, LogOut, MonitorPlay, type LucideIcon } from "lucide-react";

const NAV: { href: string; label: string; sub: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Dashboard", sub: "Overview & usage", icon: LayoutDashboard },
  { href: "/admin/exams", label: "Exams & courses", sub: "Submission · course notes", icon: CalendarCheck },
  { href: "/admin/rooms", label: "Exam rooms", sub: "Seating · demo screen", icon: DoorOpen },
  { href: "/admin/settings", label: "Settings", sub: "Alert timing · rules audio", icon: BellRing },
];

export function AdminNav({ name, logout }: { name: string; logout: () => Promise<void> }) {
  const path = usePathname();
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));

  return (
    <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:flex-shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between gap-3 px-5 py-4 lg:block lg:py-6">
        <div>
          <p className="text-lg font-bold tracking-tight text-slate-900">
            iProctor <span className="text-rose-600">MFU</span>
          </p>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Admin Panel</p>
        </div>
        <form action={logout} className="lg:hidden">
          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {NAV.map(({ href, label, sub, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 transition ${
              active(href) ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span className="min-w-0">
              <span className="block whitespace-nowrap text-sm font-semibold">{label}</span>
              <span className={`hidden text-xs lg:block ${active(href) ? "text-slate-300" : "text-slate-400"}`}>{sub}</span>
            </span>
          </Link>
        ))}
        <Link
          href="/portal"
          className="flex flex-shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-slate-600 transition hover:bg-slate-100 lg:mt-4 lg:border-t lg:border-slate-100 lg:pt-4"
        >
          <MonitorPlay className="h-5 w-5 flex-shrink-0" />
          <span className="whitespace-nowrap text-sm font-semibold">Proctor portal</span>
        </Link>
      </nav>

      <div className="hidden border-t border-slate-100 px-5 py-4 lg:block">
        <p className="truncate text-sm font-medium text-slate-900">{name}</p>
        <form action={logout}>
          <button className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
