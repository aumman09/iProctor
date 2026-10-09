import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// ใช้ได้ทั้งในแอป (server only) และสคริปต์ seed/import — ไม่ import "server-only" เพื่อให้ tsx รันได้

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set (ดู .env.example)");

// dev: Next hot-reload สร้างโมดูลใหม่บ่อย → เก็บ connection ไว้ใน globalThis ไม่ให้ connection รั่ว
const g = globalThis as unknown as { __iproctorSql?: postgres.Sql };
const client = g.__iproctorSql ?? postgres(url, { max: 10 });
if (process.env.NODE_ENV !== "production") g.__iproctorSql = client;

export const db = drizzle(client, { schema });
export type DB = typeof db;
export { client as sql, schema };
