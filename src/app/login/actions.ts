"use server";

import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/server/auth";

export async function mockLogin(formData: FormData) {
  const role = formData.get("role");
  if (role !== "proctor" && role !== "admin") redirect("/login");
  await signIn(role);
  redirect("/portal");
}

export async function logout() {
  await signOut();
  redirect("/login");
}
