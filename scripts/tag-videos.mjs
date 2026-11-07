// Tags every video with what it codes in (v1.5): writes `codeLang` (and `alsoCodeLang` when the
// title names more than one language) onto each video in src/data/resources.json and
// src/data/path/beginner-path.json, from the committed table src/data/code-langs.json.
// Usage: npm run tag:videos   (then npm run check:links verifies the result)
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { deriveCodeLang, loadTable, videoUses } from "./lib/code-lang.mjs";
import { fmt } from "./lib/fmt.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const PATH_FILE = `${root}src/data/path/beginner-path.json`;
const RES_FILE = `${root}src/data/resources.json`;
const path = JSON.parse(fs.readFileSync(PATH_FILE, "utf8"));
const resources = JSON.parse(fs.readFileSync(RES_FILE, "utf8"));
const table = loadTable(root);

const counts = {};
const errors = [];
const seen = new Set();
for (const { v, roles, where } of videoUses(path, resources)) {
  const d = deriveCodeLang(v, roles, table);
  if (d.error) {
    errors.push(`${where} · ${v.id}: ${d.error}`);
    continue;
  }
  v.codeLang = d.codeLang;
  if (d.alsoCodeLang.length) v.alsoCodeLang = d.alsoCodeLang;
  else delete v.alsoCodeLang;
  if (!seen.has(v.id)) {
    seen.add(v.id);
    counts[d.codeLang] = (counts[d.codeLang] ?? 0) + 1;
  }
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
fs.writeFileSync(PATH_FILE, `${fmt(path)}\n`);
fs.writeFileSync(RES_FILE, `${fmt(resources)}\n`);
console.log(`Tagged ${seen.size} videos:`, counts);
