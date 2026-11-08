// Refreshes every sheet problem's difficulty from the platforms (v1.6, must-do problems), without
// downloading the sheets' sources again (npm run gen:sheets writes the same fields when it rebuilds):
// - LeetCode problems: LeetCode's difficulty (GraphQL), `difficultyFrom: "lc"`.
// - Codeforces problems: the problem rating (problemset.problems), `rating`.
// - Neither: the sheet creator's own level stays (`difficultyFrom: "sheet"`), or `difficulty: null`.
// Nothing is guessed: a problem nobody rates stays null and ranks last in must-do lists.
// Usage: npm run fill:difficulty   (then npm run check:links verifies the result)
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { cfProblemset, lcQuestions } from "./lib/platforms.mjs";
import { difficultyFields, sheetJson, withDifficulty } from "./lib/sheet-json.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const DIR = `${root}src/data/sheets`;
const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json"));
const sheets = files.map((f) => ({ f, doc: JSON.parse(fs.readFileSync(`${DIR}/${f}`, "utf8")) }));
const problems = sheets.flatMap((s) => s.doc.sections.flatMap((sec) => sec.problems));

const slugs = [...new Set(problems.flatMap((p) => (p.lc ? [p.lc] : [])))];
console.log(`Asking LeetCode about ${slugs.length} problems…`);
const lc = await lcQuestions(slugs);
const cfIds = [...new Set(problems.flatMap((p) => (p.cf ? [p.cf] : [])))];
const cf = cfIds.length ? await cfProblemset() : new Map();
if (cfIds.length) console.log(`Read ${cf.size} Codeforces problemset problems`);

let missing = 0;
const counts = { lc: 0, sheet: 0, cf: 0, none: 0 };
for (const s of sheets) {
  for (const sec of s.doc.sections) {
    sec.problems = sec.problems.map((p) => {
      const lcMeta = p.lc ? lc.get(p.lc) : null;
      const cfMeta = p.cf ? cf.get(p.cf) : null;
      if (p.lc && !lcMeta) {
        console.error(`${s.doc.id}: LeetCode has no problem "${p.lc}" (run npm run gen:sheets)`);
        missing++;
      }
      if (p.cf && !cfMeta) {
        console.error(`${s.doc.id}: Codeforces has no problem ${p.cf} (run npm run gen:sheets)`);
        missing++;
      }
      // A problem not on LeetCode keeps the sheet's own level, which only gen:sheets can read again.
      const level = !lcMeta && p.difficultyFrom !== "lc" && p.difficulty ? p.difficulty : null;
      const fields = difficultyFields({ lcMeta, cfMeta, level });
      if (fields.difficultyFrom) counts[fields.difficultyFrom]++;
      if (fields.rating) counts.cf++;
      if (!fields.difficultyFrom && !fields.rating) counts.none++;
      return withDifficulty(p, fields);
    });
  }
  fs.writeFileSync(`${DIR}/${s.f}`, sheetJson(s.doc));
}
console.log(
  `Wrote ${sheets.length} sheets: ${counts.lc} LeetCode difficulties, ${counts.cf} Codeforces ratings, ${counts.sheet} sheet levels, ${counts.none} with no known difficulty (listed rows, not distinct problems).`,
);
if (missing) {
  console.error(`${missing} problem(s) no longer found on their platform.`);
  process.exit(1);
}
