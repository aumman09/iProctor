// npm run db:layouts — โหลดผังห้องจาก data/seating/*.json เข้าฐานข้อมูล (สร้างเวอร์ชันใหม่เฉพาะห้องที่ผังเปลี่ยน)
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { db, sql } from "../../src/lib/server/db";
import { importLayouts } from "../../src/lib/server/import/layouts";
import type { RoomLayoutResponse } from "../../src/lib/types";

const dir = path.join(process.cwd(), "data", "seating");
const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
const layouts = await Promise.all(
  files.map(async (f) => JSON.parse((await readFile(path.join(dir, f), "utf8")).replace(/^﻿/, "")) as RoomLayoutResponse),
);

const stats = await importLayouts(db, layouts, "data/seating");
console.log(`layouts: ${stats.rooms} ห้อง — ใหม่ ${stats.added}, อัปเดต ${stats.updated}, เหมือนเดิม ${stats.unchanged}`);
await sql.end();
