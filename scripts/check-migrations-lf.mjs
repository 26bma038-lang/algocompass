// Fails if any SQL migration contains a carriage return. sqlx checksums the exact bytes of each
// migration, so a CRLF copy (e.g. from core.autocrlf on Windows) bricks every install that applied
// the LF version (v1.3.0). Runs before every build and test run. See .gitattributes.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dirname, "..", "src-tauri", "migrations");
const bad = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .filter((f) => readFileSync(join(dir, f)).includes(0x0d));

if (bad.length) {
  console.error(`Migrations with CRLF line endings (must be LF): ${bad.join(", ")}`);
  console.error("Fix: git rm --cached -r src-tauri/migrations && git checkout -- src-tauri/migrations");
  process.exit(1);
}
console.log("Migrations are LF.");
