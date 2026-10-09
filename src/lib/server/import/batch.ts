// นำเข้าข้อมูลรายช่วงสอบ (ห้อง/วิชา/ผู้คุมสอบ) ในรูปแบบกลาง ImportBatch
// แหล่งข้อมูลจริง (Blendata) ต้องแปลงข้อมูลเป็น ImportBatch ก่อน — ดู ./blendata.ts

import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import type { DB } from "../db";
import {
  courses,
  examPeriods,
  examSlots,
  importRuns,
  proctorAssignments,
  roomLayouts,
  slotCourses,
  staff,
} from "../db/schema";
import type { SeatColorTheme, SessionName } from "../../types";

export interface ImportBatch {
  period: { academicYear: number; term: number; kind: "MIDTERM" | "FINAL"; startsOn?: string; endsOn?: string };
  staff: Array<{ staffId: string; name: string; type: "LECTURER" | "STAFF"; email?: string }>;
  courses: Array<{ courseCode: string; courseName: string }>;
  slots: Array<{
    /** ต้องตรงกับห้องที่มีผังแล้ว เช่น "C5-302" */
    roomId: string;
    /** "YYYY-MM-DD" */
    date: string;
    session: SessionName;
    courses: Array<{
      courseCode: string;
      section?: string;
      /** ตัวอักษรนำเลขที่นั่งในผัง ("A"/"B"/"" ) */
      seatGroup: string;
      /** ไม่ระบุ = ใช้สีของกลุ่มในผังห้อง */
      seatColor?: SeatColorTheme;
      /** "HH:MM" หรือ "HH:MM:SS" */
      startTime: string;
      endTime: string;
      studentIdRange?: string;
      instructions?: string;
    }>;
    proctors: Array<{ staffId: string; role: "HEAD" | "ASSISTANT" }>;
  }>;
}

export const periodId = (p: ImportBatch["period"]) => `${p.academicYear}-${p.term}-${p.kind}`;
export const periodLabel = (p: ImportBatch["period"]) =>
  `${p.kind === "MIDTERM" ? "Midterm" : "Final"} ${p.term}/${p.academicYear}`;

/**
 * นำเข้า 1 ช่วงสอบแบบ "แทนที่ทั้งช่วง": รอบสอบของช่วงนี้ที่ไม่อยู่ใน batch จะถูกลบ
 * ดึงซ้ำกี่ครั้งก็ได้ผลเท่าเดิม (idempotent) · ทำใน transaction เดียว ผิดพลาด = ไม่เปลี่ยนอะไรเลย
 */
export async function importBatch(db: DB, batch: ImportBatch, source: string) {
  const pid = periodId(batch.period);
  const [run] = await db.insert(importRuns).values({ source, periodId: pid }).returning({ id: importRuns.id });
  const warnings: string[] = [];

  try {
    const stats = await db.transaction(async (tx) => {
      const now = new Date();
      await tx
        .insert(examPeriods)
        .values({ id: pid, ...batch.period, label: periodLabel(batch.period) })
        .onConflictDoUpdate({
          target: examPeriods.id,
          set: { label: periodLabel(batch.period), startsOn: batch.period.startsOn, endsOn: batch.period.endsOn, updatedAt: now },
        });

      if (batch.staff.length)
        await tx
          .insert(staff)
          .values(batch.staff)
          .onConflictDoUpdate({
            target: staff.staffId,
            set: { name: sql`excluded.name`, type: sql`excluded.type`, email: sql`excluded.email`, updatedAt: now },
          });
      if (batch.courses.length)
        await tx
          .insert(courses)
          .values(batch.courses)
          .onConflictDoUpdate({ target: courses.courseCode, set: { courseName: sql`excluded.course_name`, updatedAt: now } });

      // ห้องต้องมีผังแล้ว (นำเข้าจาก PDF) — ไม่มีผัง = ข้ามรอบนั้นและแจ้งเตือน
      const roomIds = [...new Set(batch.slots.map((s) => s.roomId.toUpperCase()))];
      const layouts = roomIds.length
        ? await tx
            .select({ roomId: roomLayouts.roomId, layout: roomLayouts.layout })
            .from(roomLayouts)
            .where(and(inArray(roomLayouts.roomId, roomIds), eq(roomLayouts.isCurrent, true)))
        : [];
      const groupColor = new Map(layouts.map((l) => [l.roomId, new Map(l.layout.groups.map((g) => [g.key, g.colorTheme]))]));
      const knownStaff = new Set(
        (await tx.select({ id: staff.staffId }).from(staff)).map((s) => s.id),
      );

      const keptSlotIds: number[] = [];
      let courseRows = 0;
      let proctorRows = 0;
      for (const s of batch.slots) {
        const roomId = s.roomId.toUpperCase();
        const where = `${roomId} ${s.date} ${s.session}`;
        const groups = groupColor.get(roomId);
        if (!groups) {
          warnings.push(`${where}: ไม่มีผังห้อง ${roomId} — ข้าม`);
          continue;
        }

        const [slot] = await tx
          .insert(examSlots)
          .values({ periodId: pid, roomId, examDate: s.date, session: s.session })
          .onConflictDoUpdate({
            target: [examSlots.roomId, examSlots.examDate, examSlots.session],
            set: { periodId: pid, updatedAt: now },
          })
          .returning({ id: examSlots.id });
        keptSlotIds.push(slot.id);

        // ผู้คุมสอบ: แทนที่ทั้งชุด · วิชา: upsert ตาม (รอบ, วิชา, กลุ่มเรียน) เพื่อไม่ให้ note ของ Admin
        // และสถานะ "สอบเสร็จ" หาย แล้วลบเฉพาะวิชาที่หายไปจากแหล่งข้อมูล
        await tx.delete(proctorAssignments).where(eq(proctorAssignments.slotId, slot.id));

        const courseValues = s.courses.flatMap((c) => {
          const color = c.seatColor ?? groups.get(c.seatGroup);
          if (!groups.has(c.seatGroup)) warnings.push(`${where}: วิชา ${c.courseCode} ใช้กลุ่มที่นั่ง '${c.seatGroup}' ที่ไม่มีในผัง`);
          if (!color) return [];
          return [{
            slotId: slot.id,
            courseCode: c.courseCode,
            section: c.section ?? "1",
            seatGroup: c.seatGroup,
            seatColor: color,
            startTime: c.startTime,
            endTime: c.endTime,
            studentIdRange: c.studentIdRange,
            instructions: c.instructions,
          }];
        });
        const keptCourseIds: number[] = [];
        for (const v of courseValues) {
          const [row] = await tx
            .insert(slotCourses)
            .values(v)
            .onConflictDoUpdate({
              target: [slotCourses.slotId, slotCourses.courseCode, slotCourses.section],
              set: {
                seatGroup: v.seatGroup,
                seatColor: v.seatColor,
                startTime: v.startTime,
                endTime: v.endTime,
                studentIdRange: v.studentIdRange ?? null,
                instructions: v.instructions ?? null,
                updatedAt: now,
              },
            })
            .returning({ id: slotCourses.id });
          keptCourseIds.push(row.id);
        }
        await tx
          .delete(slotCourses)
          .where(
            keptCourseIds.length
              ? and(eq(slotCourses.slotId, slot.id), notInArray(slotCourses.id, keptCourseIds))
              : eq(slotCourses.slotId, slot.id),
          );
        courseRows += courseValues.length;

        const proctorValues = s.proctors.filter((p) => {
          if (knownStaff.has(p.staffId)) return true;
          warnings.push(`${where}: ไม่รู้จักผู้คุมสอบรหัส ${p.staffId} — ข้าม`);
          return false;
        });
        if (proctorValues.length) await tx.insert(proctorAssignments).values(proctorValues.map((p) => ({ slotId: slot.id, ...p })));
        proctorRows += proctorValues.length;
      }

      // รอบสอบของช่วงนี้ที่หายไปจากแหล่งข้อมูล → ลบ (slot_courses/assignments ลบตาม cascade)
      const removed = await tx
        .delete(examSlots)
        .where(
          keptSlotIds.length
            ? and(eq(examSlots.periodId, pid), notInArray(examSlots.id, keptSlotIds))
            : eq(examSlots.periodId, pid),
        )
        .returning({ id: examSlots.id });

      return {
        staff: batch.staff.length,
        courses: batch.courses.length,
        slots: keptSlotIds.length,
        slotCourses: courseRows,
        proctorAssignments: proctorRows,
        slotsRemoved: removed.length,
        slotsSkipped: batch.slots.length - keptSlotIds.length,
      };
    });

    await db
      .update(importRuns)
      .set({ status: "SUCCESS", finishedAt: new Date(), stats, warnings })
      .where(eq(importRuns.id, run.id));
    return { runId: run.id, periodId: pid, stats, warnings };
  } catch (e) {
    await db
      .update(importRuns)
      .set({ status: "FAILED", finishedAt: new Date(), warnings, error: e instanceof Error ? e.message : String(e) })
      .where(eq(importRuns.id, run.id));
    throw e;
  }
}

