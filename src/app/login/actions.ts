"use server";

import { redirect } from "next/navigation";
import { MOCK_USERS, signIn, signOut } from "@/lib/server/auth";
import { logUsage } from "@/lib/server/usage";

export async function mockLogin(formData: FormData) {
  const role = formData.get("role");
  if (role !== "proctor" && role !== "admin") redirect("/login");
  await signIn(role);
  await logUsage("LOGIN", { staffId: MOCK_USERS[role].staff_id });
  redirect(role === "admin" ? "/admin" : "/portal");
}

export async function logout() {
  await signOut();
  redirect("/login");
}
