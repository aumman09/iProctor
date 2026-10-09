// ดึงข้อมูลช่วงสอบจาก Blendata (ถังข้อมูลกลางของมหาวิทยาลัย) แล้วแปลงเป็น ImportBatch
//
// TODO: ยังไม่มีเอกสาร API — เมื่อได้แล้วให้เขียน fetch + แปลงข้อมูลในไฟล์นี้ที่เดียว
// สิ่งที่ต้อง map ให้ได้ (ดู ImportBatch ใน ./batch.ts):
//   - ห้องสอบ → roomId รูปแบบเดียวกับผัง เช่น "C5-302" (อาคาร-ห้อง)
//   - วิชาในห้อง → กลุ่มที่นั่ง A/B (ชมพู/ขาว) — ถ้า Blendata ไม่มี ต้องหาวิธีจับคู่ (เช่น ลำดับวิชาในห้อง)
//   - เวลาเริ่ม/จบรายวิชา (วิชา 2 ชม. กับ 3 ชม. ในรอบเดียวกัน)
//   - ผู้คุมสอบ + บทบาท (อาจารย์หลัก = HEAD, พนักงาน = ASSISTANT)

import type { ImportBatch } from "./batch";

export interface BlendataConfig {
  url: string;
  token: string;
}

export function blendataConfig(): BlendataConfig {
  const url = process.env.BLENDATA_API_URL;
  const token = process.env.BLENDATA_API_TOKEN;
  if (!url || !token) throw new Error("ยังไม่ได้ตั้งค่า BLENDATA_API_URL / BLENDATA_API_TOKEN (ดู .env.example)");
  return { url, token };
}

export async function fetchBlendataBatch(config: BlendataConfig, period: ImportBatch["period"]): Promise<ImportBatch> {
  throw new Error(
    `ยังไม่ได้เชื่อม Blendata API (${config.url}) สำหรับ ${period.kind} ${period.term}/${period.academicYear} — รอเอกสาร API`,
  );
}
