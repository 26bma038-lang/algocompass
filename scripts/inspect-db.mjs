// Read-only look inside an AlgoCompass database: which migrations it has and how many rows each
// table holds. Used to check a build against real data before a release (MAINTAINING.md).
//   node scripts/inspect-db.mjs                        %APPDATA%\com.algocompass.app\algocompass.db
//   node scripts/inspect-db.mjs path\to\algocompass.db
// The file is read into memory with sql.js and never written. Quit the app first for a consistent copy.
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
const SQL = await initSqlJs();
const db = new SQL.Database(fs.readFileSync(file));
const rows = (sql) => {
  const r = db.exec(sql)[0];
  return r ? r.values : [];
};

console.log(file);
const migrations = rows("SELECT version, description, success FROM _sqlx_migrations ORDER BY version");
console.log(`\nMigrations (${migrations.length}):`);
for (const [v, d, ok] of migrations) console.log(`  ${String(v).padStart(4)}  ${d}${ok ? "" : "  (FAILED)"}`);
console.log("\nRows per table:");
for (const [name] of rows("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> '_sqlx_migrations' ORDER BY name")) {
  console.log(`  ${String(rows(`SELECT COUNT(*) FROM "${name}"`)[0][0]).padStart(7)}  ${name}`);
}
db.close();
