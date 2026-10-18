// Fills the hand-curated Beginner Path (src/data/path/beginner-path.json) and the topic videos in
// src/data/resources.json from the platforms themselves, so nothing is typed from memory:
// - videos: title and channel from YouTube oEmbed. A video oEmbed refuses (deleted, private, or
//   embedding disabled) is reported and removed.
// - path problems: LeetCode title, difficulty and premium flag (GraphQL), or the Codeforces name and
//   rating (problemset.problems), plus the problem's key and topics. A missing problem fails the run.
// Usage: npm run fill:media   (then npm run check:links verifies the result)
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { cfProblemset, lcQuestions, pool, ytOembed } from "./lib/platforms.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const PATH_FILE = `${root}src/data/path/beginner-path.json`;
const RES_FILE = `${root}src/data/resources.json`;
const topics = JSON.parse(fs.readFileSync(`${root}src/data/topics.json`, "utf8")).topics;
const lcTagIndex = new Map();
for (const t of topics) for (const tag of t.lcTags) lcTagIndex.set(tag, [...(lcTagIndex.get(tag) ?? []), t.id]);
const cfTagIndex = new Map();
for (const t of topics) for (const tag of t.cfTags) cfTagIndex.set(tag, [...(cfTagIndex.get(tag) ?? []), t.id]);

const path = JSON.parse(fs.readFileSync(PATH_FILE, "utf8"));
const resources = JSON.parse(fs.readFileSync(RES_FILE, "utf8"));
let problems = 0;

// ---- videos ----
const videoLists = [
  ...path.steps.flatMap((s) => Object.values(s.videos)),
  ...Object.values(resources.topics).flatMap((t) => (t.videos ? [t.videos] : [])),
];
const ids = [...new Set(videoLists.flat().map((v) => v.id))];
console.log(`Asking YouTube oEmbed about ${ids.length} videos…`);
const meta = new Map(ids.map((id, i) => [id, i]));
const answers = await pool(ids, 6, (id) => ytOembed(id));
const byId = new Map(ids.map((id) => [id, answers[meta.get(id)]]));
let removed = 0;
for (const list of videoLists) {
  for (let i = list.length - 1; i >= 0; i--) {
    const v = list[i];
    const m = byId.get(v.id);
    if (!m.ok) {
      console.error(`REMOVED ${v.id}: oEmbed HTTP ${m.status} (deleted, private or embedding disabled)`);
      list.splice(i, 1);
      removed++;
      continue;
    }
    v.title = m.title;
    v.channel = m.author;
  }
}

// ---- path problems ----
const lcSlugs = path.steps.flatMap((s) => s.problems.flatMap((p) => (p.lc ? [p.lc] : [])));
const lc = await lcQuestions(lcSlugs);
const cf = path.steps.some((s) => s.problems.some((p) => p.cf)) ? await cfProblemset() : new Map();
let failed = 0;
for (const s of path.steps) {
  s.problems = s.problems.map((p) => {
    problems++;
    if (p.lc) {
      const m = lc.get(p.lc);
      if (!m) {
        console.error(`FAIL ${s.id}: LeetCode has no problem "${p.lc}"`);
        failed++;
        return p;
      }
      if (m.isPaidOnly) console.error(`WARN ${s.id}: ${p.lc} is LeetCode Premium`);
      if (m.difficulty !== "Easy") console.error(`WARN ${s.id}: ${p.lc} is ${m.difficulty}, not Easy`);
      const tagTopics = m.tags.flatMap((t) => lcTagIndex.get(t) ?? []);
      return {
        key: `lc:${p.lc}`,
        title: m.title,
        difficulty: m.difficulty,
        topics: [...new Set([...s.topics, ...tagTopics])],
        lc: p.lc,
        ...(m.isPaidOnly ? { premium: true } : {}),
        required: p.required,
      };
    }
    const m = cf.get(p.cf);
    if (!m) {
      console.error(`FAIL ${s.id}: Codeforces has no problem ${p.cf}`);
      failed++;
      return p;
    }
    const tagTopics = m.tags.flatMap((t) => cfTagIndex.get(t) ?? []);
    return {
      key: `cf:${p.cf}`,
      title: m.name,
      difficulty: null,
      rating: m.rating,
      topics: [...new Set([...s.topics, ...tagTopics])],
      cf: p.cf,
      required: p.required,
    };
  });
}

/** JSON with small objects (a video, a problem) and short arrays on one line, so diffs stay readable. */
function fmt(v, ind = "") {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  const next = `${ind}  `;
  const items = Array.isArray(v) ? v.map((x) => fmt(x, next)) : Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${fmt(x, next)}`);
  const open = Array.isArray(v) ? "[" : "{";
  const close = Array.isArray(v) ? "]" : "}";
  const line = Array.isArray(v) ? `[${items.join(", ")}]` : `{ ${items.join(", ")} }`;
  const record = !Array.isArray(v) && ("id" in v || "key" in v);
  if (!items.some((s) => s.includes("\n")) && (line.length + ind.length <= 110 || (record && line.length <= 420))) return items.length ? line : `${open}${close}`;
  return `${open}\n${items.map((s) => next + s).join(",\n")}\n${ind}${close}`;
}
const write = (file, doc) => fs.writeFileSync(file, `${fmt(doc)}\n`);
write(PATH_FILE, path);
write(RES_FILE, resources);
console.log(`Filled ${ids.length - removed} videos (${removed} removed) and ${problems} path problems${failed ? `, ${failed} FAILED` : ""}.`);
process.exit(failed ? 1 : 0);
