// Read-only look inside an AlgoCompass database: which migrations it has and how many rows each
// table holds. Used to check a build against real data before a release (MAINTAINING.md).
//   node scripts/inspect-db.mjs                        %APPDATA%\com.algocompass.app\algocompass.db
//   node scripts/inspect-db.mjs path\to\algocompass.db
// Opened read-only with Node's built-in SQLite (Node 22.13+, which also reads a pending -wal file),
// else read into memory with sql.js (which can't see a -wal file: quit the app first). Never written.
import fs from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const initSqlJs = require("sql.js");
const file = process.argv[2] ?? join(process.env.APPDATA ?? "", "com.algocompass.app", "algocompass.db");
if (!fs.existsSync(file)) {
  console.error(`No database at ${file}`);
  process.exit(1);
}
let rows;
let close;
try {
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(file, { readOnly: true });
  rows = (sql) => db.prepare(sql).all().map((r) => Object.values(r));
  close = () => db.close();
} catch {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(file));
  rows = (sql) => db.exec(sql)[0]?.values ?? [];
  close = () => db.close();
}

console.log(file);
const migrations = rows("SELECT version, description, success FROM _sqlx_migrations ORDER BY version");
console.log(`\nMigrations (${migrations.length}):`);
for (const [v, d, ok] of migrations) console.log(`  ${String(v).padStart(4)}  ${d}${ok ? "" : "  (FAILED)"}`);
console.log("\nRows per table:");
for (const [name] of rows("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> '_sqlx_migrations' ORDER BY name")) {
  console.log(`  ${String(rows(`SELECT COUNT(*) FROM "${name}"`)[0][0]).padStart(7)}  ${name}`);
}
close();
