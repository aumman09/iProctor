// npm run db:migrate — รัน migration ใน ./drizzle
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, sql } from "../../src/lib/server/db";

await migrate(db, { migrationsFolder: "drizzle" });
console.log("migrate: เรียบร้อย");
await sql.end();
