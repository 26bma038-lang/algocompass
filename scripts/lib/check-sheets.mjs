// Verifies the bundled sheets (src/data/sheets/*.json) against the platforms. Used by check-links.mjs.
// - Structure: ids, sections, a key/title/topics on every problem, topics that exist in topics.json.
// - LeetCode: every `lc` slug exists (question(titleSlug)), with the stored title and difficulty
//   (`difficultyFrom: "lc"`).
// - Codeforces: every `cf` id ("1462-A") exists in problemset.problems, with the stored name and rating.
// - --deep: also GETs every takeUforward practice link (they answer a real 404 for unknown slugs).
import fs from "node:fs";
import { cfProblemset, get, lcQuestions, pool } from "./platforms.mjs";

export async function checkSheets({ root, report, quiet, deep }) {
  const dir = `${root}src/data/sheets`;
  const topicIds = new Set(JSON.parse(fs.readFileSync(`${root}src/data/topics.json`, "utf8")).topics.map((t) => t.id));
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  let failures = 0;
  const fail = (label, detail) => {
    failures++;
    report(false, label, detail);
  };

  const all = [];
  for (const f of files) {
    const sheet = JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8"));
    if (`${sheet.id}.json` !== f) fail(`sheet ${f}`, `id "${sheet.id}" doesn't match the file name`);
    for (const k of ["name", "short", "creator", "sourceUrl"]) if (!sheet[k]) fail(`sheet ${sheet.id}`, `missing ${k}`);
    if (!Array.isArray(sheet.sections) || !sheet.sections.length) fail(`sheet ${sheet.id}`, "no sections");
    for (const sec of sheet.sections ?? []) {
      for (const p of sec.problems ?? []) {
        const label = `sheet ${sheet.id} · ${sec.title} · ${p.title}`;
        if (!p.key || !p.title) fail(label, "missing key or title");
        if (!Array.isArray(p.topics) || !p.topics.length) fail(label, "no topics");
        for (const t of p.topics ?? []) if (!topicIds.has(t)) fail(label, `unknown topic "${t}"`);
        // v1.6: a difficulty says where it came from; only a problem off LeetCode keeps the sheet's level.
        if (p.difficulty && !["lc", "sheet"].includes(p.difficultyFrom)) fail(label, "difficulty without difficultyFrom");
        if (!p.difficulty && p.difficultyFrom) fail(label, "difficultyFrom without a difficulty");
        if (p.difficultyFrom === "sheet" && p.lc) fail(label, "a LeetCode problem must carry LeetCode's difficulty");
        all.push({ sheet, sec, p, label });
      }
    }
  }
  console.log(`Checking ${files.length} sheets (${all.length} problems)…`);

  const slugs = [...new Set(all.flatMap((x) => (x.p.lc ? [x.p.lc] : [])))];
  console.log(`Checking ${slugs.length} sheet LeetCode slugs…`);
  const lc = await lcQuestions(slugs);
  let lcOk = 0;
  for (const { p, label } of all) {
    if (!p.lc) continue;
    const m = lc.get(p.lc);
    const issues = [];
    if (!m) issues.push(`LeetCode has no problem "${p.lc}"`);
    else {
      if (m.title !== p.title) issues.push(`LeetCode title is "${m.title}"`);
      if (m.difficulty !== p.difficulty) issues.push(`LeetCode difficulty is ${m.difficulty}`);
      if (p.difficultyFrom !== "lc") issues.push(`difficultyFrom is ${p.difficultyFrom ?? "missing"}, not "lc" (run npm run fill:difficulty)`);
      if (!!m.isPaidOnly !== !!p.premium) issues.push(m.isPaidOnly ? "premium on LeetCode but not marked" : "marked premium but free");
    }
    if (issues.length) fail(label, issues.join("; "));
    else lcOk++;
  }
  if (!quiet) console.log(`ok    ${lcOk} sheet LeetCode links match LeetCode`);

  const cfRows = all.filter((x) => x.p.cf);
  if (cfRows.length) {
    const cf = await cfProblemset();
    let cfOk = 0;
    for (const { p, label } of cfRows) {
      const m = cf.get(p.cf);
      if (!m) fail(label, `Codeforces has no problem ${p.cf}`);
      else if (m.name !== p.title) fail(label, `Codeforces name is "${m.name}"`);
      else if ((m.rating ?? null) !== (p.rating ?? null)) fail(label, `Codeforces rating is ${m.rating ?? "none"} (run npm run fill:difficulty)`);
      else cfOk++;
    }
    if (!quiet) console.log(`ok    ${cfOk}/${cfRows.length} sheet Codeforces ids match problemset.problems`);
  }

  if (deep) {
    const tuf = [...new Set(all.flatMap((x) => (x.p.links?.tuf ? [x.p.links.tuf] : [])))];
    console.log(`Checking ${tuf.length} takeUforward practice links…`);
    const results = await pool(tuf, 6, async (url) => {
      try {
        const res = await get(url);
        await res.arrayBuffer();
        return res.ok ? null : `HTTP ${res.status}`;
      } catch (e) {
        return `network error: ${e.cause?.code ?? e.message}`;
      }
    });
    let ok = 0;
    tuf.forEach((url, i) => (results[i] ? fail(`takeUforward ${url}`, results[i]) : ok++));
    if (!quiet) console.log(`ok    ${ok}/${tuf.length} takeUforward links`);
  }
  return failures;
}
