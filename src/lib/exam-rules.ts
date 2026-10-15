// ประกาศระเบียบการสอบ (คณะอนุกรรมการควบคุมการสอบ) — ตรงกับเสียง public/audio/02_exam_rules.mp3
// หน้าจอแสดงอังกฤษด้านบน ไทยด้านล่าง และไฮไลต์ข้อที่เสียงกำลังอ่านตาม RULES_CUES

export interface ExamRule {
  en: string;
  th: string;
}

export const RULES_HEADING: ExamRule = {
  en: "Examination Committee Announcement",
  th: "ประกาศจากคณะอนุกรรมการควบคุมการสอบ",
};

export const EXAM_RULES: ExamRule[] = [
  {
    en: "Hand in any unauthorized documents to the proctor immediately. Possession of such items will be considered cheating.",
    th: "ผู้เข้าสอบโปรดตรวจสอบว่า มีเอกสารใดๆ ที่นำติดตัวเข้าห้องสอบหรือไม่ หากพบว่ามี ให้นำมามอบแก่ผู้ควบคุมการสอบทันที มิฉะนั้น หากตรวจพบภายหลัง จะถือว่ามีเจตนาทุจริตในการสอบ",
  },
  {
    en: "The use of all communication devices is not permitted.",
    th: "ไม่อนุญาตให้ผู้เข้าสอบใช้เครื่องมือสื่อสารทุกชนิด ในห้องสอบ",
  },
  {
    en: "Wallets and turned-off phones are permitted but must be placed on the floor next to or under your chair.",
    th: "อนุญาตให้นำกระเป๋าสตางค์และโทรศัพท์ที่ปิดเครื่องแล้วเข้าห้องสอบได้ โดยให้วางไว้ที่พื้นข้างเก้าอี้หรือใต้เก้าอี้ เท่านั้น",
  },
  {
    en: "You must read the cover instructions, sign your name, and check the number of examination pages before starting.",
    th: "ผู้เข้าสอบโปรดอ่านคำสั่ง ในใบปะหน้าข้อสอบพร้อมลงลายมือชื่อรับทราบ และตรวจนับจำนวนหน้าของข้อสอบ ก่อนเริ่มทำข้อสอบ",
  },
  {
    en: "You are not permitted to use the restroom. You may leave the examination room only after 45 minutes of the examination time have elapsed.",
    th: "ไม่อนุญาตให้ผู้เข้าสอบเข้าห้องน้ำระหว่างการสอบ และผู้เข้าสอบสามารถออกจากห้องสอบได้เมื่อการสอบดำเนินไปแล้วอย่างน้อย 45 นาที",
  },
  {
    en: "After submitting the examination paper, you must leave the examination area immediately. Violation of the above clause will result in a penalty.",
    th: "เมื่อผู้เข้าสอบส่งข้อสอบเรียบร้อยแล้ว ต้องออกไปให้พ้นบริเวณห้องที่มีการสอบทันที หากไม่ปฏิบัติตามถือว่ามีความผิดทางวินัยและมีบทลงโทษ",
  },
];

/** คำเตือนท้ายประกาศ — ตัว "F" แสดงเป็นสีแดง */
export const RULES_WARNING: ExamRule = {
  en: "Warning: Cheating will result in an F grade for all courses this semester.",
  th: "คำเตือน หากทุจริตในการสอบ จะได้รับ F ทุกรายวิชา ในภาคการศึกษานี้",
};

/** จำนวนช่วงที่ไฮไลต์: หัวเรื่อง + 6 ข้อ + คำเตือน */
export const RULES_CUE_COUNT = 2 + EXAM_RULES.length;

/**
 * วินาทีที่เสียงเริ่มอ่านแต่ละช่วง (หัวเรื่อง, ข้อ 1–6, คำเตือน) — ค่าประมาณจากช่วงเงียบในไฟล์เสียง
 * ปรับให้ตรงได้ที่ Admin → Alert timing → "Sync rules highlight with audio"
 */
export const DEFAULT_RULES_CUES = [0, 6.2, 29.5, 38.1, 53.8, 73.7, 95.4, 117.7];

/** ช่วงที่กำลังอ่าน ณ วินาที t (-1 = ยังไม่เริ่ม/ไม่ได้เล่น) */
export function activeCue(cues: number[], t: number | null): number {
  if (t === null) return -1;
  let i = -1;
  cues.forEach((c, j) => {
    if (t >= c) i = j;
  });
  return i;
}
