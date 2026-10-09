// npm run import:exam -- --file batch.json                       นำเข้าจากไฟล์ ImportBatch (JSON)
// npm run import:exam -- --blendata --year 2026 --term 1 --kind MIDTERM   ดึงจาก Blendata (ยังไม่ได้เชื่อม)
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { db, sql } from "../../src/lib/server/db";
import { importBatch, type ImportBatch } from "../../src/lib/server/import/batch";
import { blendataConfig, fetchBlendataBatch } from "../../src/lib/server/import/blendata";

const { values: a } = parseArgs({
  options: {
    file: { type: "string" },
    blendata: { type: "boolean" },
    year: { type: "string" },
    term: { type: "string" },
    kind: { type: "string" },
  },
});

try {
  let batch: ImportBatch;
  let source: string;
  if (a.file) {
    batch = JSON.parse(await readFile(a.file, "utf8")) as ImportBatch;
    source = `file:${a.file}`;
  } else if (a.blendata) {
    if (!a.year || !a.term || (a.kind !== "MIDTERM" && a.kind !== "FINAL")) throw new Error("ต้องระบุ --year --term --kind MIDTERM|FINAL");
    batch = await fetchBlendataBatch(blendataConfig(), { academicYear: Number(a.year), term: Number(a.term), kind: a.kind });
    source = "blendata";
  } else {
    throw new Error("ต้องระบุ --file <batch.json> หรือ --blendata");
  }

  const r = await importBatch(db, batch, source);
  console.log(`นำเข้า ${r.periodId} (run #${r.runId}):`, r.stats);
  if (r.warnings.length) console.log(`ต้องตรวจ (${r.warnings.length}):\n` + r.warnings.map((w) => `  - ${w}`).join("\n"));
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await sql.end();
}
