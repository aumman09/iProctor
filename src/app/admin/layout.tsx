import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { logout } from "../login/actions";
import { AdminNav } from "@/components/admin/AdminNav";
import { SiteFooter } from "@/components/SiteFooter";
import { getCurrentUser } from "@/lib/server/auth";

// Admin Panel — เฉพาะผู้ใช้ role admin (Server Actions ใน ./actions.ts ตรวจสิทธิ์ซ้ำอีกชั้น)
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/portal");

  return (
    <div className="min-h-screen lg:flex">
      <AdminNav name={user.name} logout={logout} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 lg:py-10">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}
