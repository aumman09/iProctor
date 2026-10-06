import "server-only";

// Mock auth (FR-01.2) — เก็บผู้ใช้ใน cookie ธรรมดา ใช้สำหรับพัฒนา/ทดสอบเท่านั้น
// TODO: เมื่อเชื่อม MFU SSO (OAuth2/OIDC) ให้แก้เฉพาะ getCurrentUser/signIn/signOut ในไฟล์นี้

import { cookies } from "next/headers";
import type { AuthUser, UserRole } from "../types";

const COOKIE = "iproctor_session";

export const MOCK_USERS: Record<UserRole, AuthUser> = {
  proctor: { staff_id: "58123456", name: "Aj. Prasit Meesook", role: "proctor" },
  admin: { staff_id: "00000001", name: "Exam Office Admin", role: "admin" },
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const role = (await cookies()).get(COOKIE)?.value;
  return role === "proctor" || role === "admin" ? MOCK_USERS[role] : null;
}

export async function signIn(role: UserRole) {
  (await cookies()).set(COOKIE, role, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
}

export async function signOut() {
  (await cookies()).delete(COOKIE);
}
