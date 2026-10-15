"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/server/auth";
import { setCourseCompletion } from "@/lib/server/data-source";
import { db } from "@/lib/server/db";
import { slotCourses } from "@/lib/server/db/schema";
import { normalizeCues, normalizeTiming, saveAlertTiming, saveRulesCues } from "@/lib/server/settings";
import { logUsage } from "@/lib/server/usage";

// Server Actions ของ Admin Panel — ตรวจสิทธิ์ทุกครั้ง (เรียกตรงด้วย POST ได้)
async function requireAdmin() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") throw new Error("Unauthorized");
  return user;
}

export type ActionState = { ok: boolean; message: string } | null;

/** ข้อกำหนดเพิ่มเติมของรายวิชา → แสดงบนการ์ดรายวิชาในหน้าจอคุมสอบ */
export async function saveCourseNote(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const id = Number(form.get("slotCourseId"));
  const note = String(form.get("note") ?? "").trim().slice(0, 300);
  if (!Number.isInteger(id)) return { ok: false, message: "Course not found" };
  const [row] = await db
    .update(slotCourses)
    .set({ adminNote: note || null, updatedAt: new Date() })
    .where(eq(slotCourses.id, id))
    .returning({ courseCode: slotCourses.courseCode });
  if (!row) return { ok: false, message: "Course not found" };
  await logUsage("NOTE_UPDATED", { staffId: user.staff_id, meta: { slotCourseId: id, courseCode: row.courseCode } });
  revalidatePath("/admin", "layout");
  return { ok: true, message: note ? "Saved" : "Note removed" };
}

/** Admin ตั้ง/ยกเลิกสถานะ "สอบเสร็จ" แทนผู้คุมสอบ */
export async function setCompletionByAdmin(form: FormData) {
  const user = await requireAdmin();
  const id = Number(form.get("slotCourseId"));
  const completed = form.get("completed") === "true";
  if (!Number.isInteger(id)) return;
  const r = await setCourseCompletion(user, id, completed);
  if (r.ok)
    await logUsage(completed ? "COURSE_COMPLETED" : "COURSE_REOPENED", {
      staffId: user.staff_id,
      roomId: r.roomId,
      meta: { slotCourseId: id, courseCode: r.courseCode, byAdmin: true },
    });
  revalidatePath("/admin", "layout");
}

/** เวลาแจ้งเตือนของทุกห้อง (มีผลกับหน้าจอคุมสอบที่โหลดตารางใหม่) */
export async function saveTimingSettings(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const num = (k: string) => (form.get(k) === null || form.get(k) === "" ? NaN : Number(form.get(k)));
  const timing = normalizeTiming({
    roomOpenBeforeMin: num("roomOpenBeforeMin"),
    departureAfterMin: num("departureAfterMin"),
    warningsBeforeEndMin: form.getAll("warning").filter((v) => v !== "").map(Number),
  });
  if (!timing) return { ok: false, message: "Invalid values — use whole minutes (room open 0–120, leave 0–240, warnings 1–120)" };
  await saveAlertTiming(timing, user.staff_id);
  await logUsage("SETTINGS_UPDATED", { staffId: user.staff_id, meta: { alertTiming: timing } });
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Alert timing saved — exam screens use it after a reload" };
}

/** เวลาเริ่มแต่ละช่วงของเสียงระเบียบการสอบ (ไฮไลต์บนจอให้ตรงเสียง) */
export async function saveRulesSync(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const cues = normalizeCues(form.getAll("cue").map((v) => Number(v)));
  if (!cues) return { ok: false, message: "Each start time must be later than the previous one (0–600 seconds)." };
  await saveRulesCues(cues, user.staff_id);
  await logUsage("SETTINGS_UPDATED", { staffId: user.staff_id, meta: { rulesCues: cues } });
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Saved — exam screens use the new timing after a reload." };
}
