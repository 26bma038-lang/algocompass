// Builds src/data/sheets/<id>.json for the popular DSA sheets, from each sheet's ORIGINAL public source:
//   striver-a2z   takeUforward, https://takeuforward.org/prep-hub/strivers-a2z-dsa-sheet
//   striver-sde   takeUforward, https://takeuforward.org/prep-hub/strivers-sde-sheet
//   neetcode-150  NeetCode's own site data (github.com/neetcode-gh/leetcode, .problemSiteData.json, used by neetcode.io)
//   blind-75      the original Blind post (teamblind.com, 2018-12-31)
//   babbar-450    Love Babbar's own spreadsheet (Google Drive .xlsx, hyperlinks read from the file)
// Source order and sections are kept. Every LeetCode slug is checked with LeetCode's GraphQL
// (question(titleSlug)) and every Codeforces id with problemset.problems; titles, difficulties and
// tags come from the platforms, never from memory. Anything that can't be verified is reported and
// its sheet is marked partial.
//
// Usage: npm run gen:sheets                 (fetch the sources live)
//        npm run gen:sheets -- --cache DIR  (also save the raw downloads to DIR, or reuse them if present)
import fs from "node:fs";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { cfProblemset, get, lcQuestions } from "./lib/platforms.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const OUT_DIR = `${root}src/data/sheets`;
const topics = JSON.parse(fs.readFileSync(`${root}src/data/topics.json`, "utf8")).topics;
const lcTagIndex = new Map();
for (const t of topics) for (const tag of t.lcTags) lcTagIndex.set(tag, [...(lcTagIndex.get(tag) ?? []), t.id]);
const cfTagIndex = new Map();
for (const t of topics) for (const tag of t.cfTags) cfTagIndex.set(tag, [...(cfTagIndex.get(tag) ?? []), t.id]);

const cacheArg = process.argv.indexOf("--cache");
const CACHE = cacheArg > 0 ? process.argv[cacheArg + 1] : null;
const TODAY = new Date().toISOString().slice(0, 10);

// ---------- fetching ----------

async function download(name, url, binary = false) {
  const path = CACHE ? `${CACHE}/${name}` : null;
  if (path && fs.existsSync(path)) return binary ? fs.readFileSync(path) : fs.readFileSync(path, "utf8");
  const res = await get(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const body = binary ? Buffer.from(await res.arrayBuffer()) : await res.text();
  if (path) {
    fs.mkdirSync(CACHE, { recursive: true });
    fs.writeFileSync(path, body);
  }
  return body;
}

/** The Next.js RSC flight payload: every self.__next_f.push([1,"…"]) string, concatenated. */
function rscPayload(html) {
  let out = "";
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) out += JSON.parse(m[1]);
  return out;
}

/** The balanced JSON value (object or array) starting at index i. */
function jsonAt(text, i) {
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let j = i; j < text.length; j++) {
    const c = text[j];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      depth--;
      if (depth === 0) return JSON.parse(text.slice(i, j + 1));
    }
  }
  throw new Error("unbalanced JSON");
}

// ---------- takeUforward (A2Z, SDE) ----------

/**
 * takeUforward ships each sheet as `sheet_syllabus: { fields, rows, roots }`: rows are arrays whose
 * first element picks a field list, categories list child row indexes, and repeated values are
 * references like "$69:sheet:sheet_syllabus:rows:52:17" (row 52, column 17).
 */
function parseTuf(html, sheetSlug) {
  const payload = rscPayload(html);
  const at = payload.indexOf('"sheet_syllabus":');
  if (at < 0) throw new Error(`${sheetSlug}: no sheet_syllabus in the page`);
  const s = jsonAt(payload, at + '"sheet_syllabus":'.length);
  const deref = (v) => {
    if (typeof v === "string" && v.startsWith("$") && v.includes(":sheet_syllabus:rows:")) {
      const [row, col] = v.split(":sheet_syllabus:rows:")[1].split(":").map(Number);
      return deref(s.rows[row][col]);
    }
    return v;
  };
  const node = (i) => {
    const r = s.rows[i];
    const o = {};
    s.fields[r[0]].forEach((name, k) => (o[name] = deref(r[k + 1])));
    return o;
  };
  const sections = [];
  for (const rootIdx of s.roots) {
    const top = node(rootIdx);
    if (top.type !== "category") continue;
    const problems = [];
    const walk = (idx, sub) => {
      const n = node(idx);
      if (n.type === "category") {
        for (const c of n.children ?? []) walk(c, n.label.trim());
      } else if (n.type === "item" && n.layoutType === "practice") {
        const lc = n.leetcode_link ? lcSlugFromUrl(n.leetcode_link) : null;
        problems.push({
          title: n.label.trim(),
          sub: sub === top.label.trim() ? null : sub,
          level: n.difficulty ?? null, // takeUforward's own level: basic / core / pro
          lc,
          links: { tuf: `https://takeuforward.org/practice/dsa/${n.slug}?source=${sheetSlug}` },
          tufSlug: n.slug,
          tufTopics: Array.isArray(n.topic_tags) ? n.topic_tags.map((t) => t.slug) : [],
        });
      }
      // "learning" items (lessons/articles) and contests aren't problems: skipped.
    };
    for (const c of top.children ?? []) walk(c, top.label.trim());
    if (problems.length) sections.push({ title: top.label.trim(), problems });
  }
  return sections;
}

// ---------- NeetCode 150 ----------

function parseNeetcode(json) {
  const data = JSON.parse(json);
  const sections = [];
  for (const p of data.filter((x) => x.neetcode150)) {
    let sec = sections.find((s) => s.title === p.pattern);
    if (!sec) sections.push((sec = { title: p.pattern, problems: [] }));
    const slug = p.link.replace(/\/$/, "");
    sec.problems.push({
      title: p.problem,
      sub: null,
      level: p.difficulty,
      lc: slug,
      // Premium LeetCode problems come with NeetCode's free alternative (e.g. LintCode).
      links: p.freeLink ? { free: p.freeLink } : {},
    });
  }
  return sections;
}

// ---------- Blind 75 (the original post) ----------

function parseBlind(html) {
  const payload = rscPayload(html);
  const at = payload.indexOf('{"@context":"https://schema.org","@type":"DiscussionForumPosting"');
  if (at < 0) throw new Error("blind-75: post JSON-LD not found");
  const post = jsonAt(payload, at);
  const sections = [];
  let sec = null;
  for (const raw of post.text.split("\n")) {
    const line = raw.trim();
    if (!line || line === "---") continue;
    const item = line.match(/^- (.+?) - ?(https:\/\/leetcode\.com\/problems\/[a-z0-9-]+\/?)?$/);
    if (item && sec) {
      const title = item[1].replace(/\s*\(Leetcode Premium\)\s*$/i, "").trim();
      sec.problems.push({ title, sub: null, level: null, lc: item[2] ? lcSlugFromUrl(item[2]) : null, links: {}, linkless: !item[2] });
    } else if (!line.startsWith("-") && /^[A-Z][A-Za-z ]+$/.test(line) && line.split(" ").length <= 3) {
      sections.push((sec = { title: line, problems: [] }));
    }
  }
  return sections.filter((s) => s.problems.length);
}

// ---------- Love Babbar 450 (.xlsx) ----------

/** Minimal .xlsx (zip) reader: the central directory, then deflate/stored entries. */
function unzip(buf) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = new Map();
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen).replace(/\\/g, "/");
    const dataAt = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(dataAt, dataAt + size);
    files.set(name, method === 8 ? zlib.inflateRawSync(data) : data);
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

const xmlText = (s) =>
  s.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

function parseBabbar(buf) {
  const files = unzip(buf);
  const strings = [...files.get("xl/sharedStrings.xml").toString("utf8").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => xmlText(m[1]));
  const sheet = files.get("xl/worksheets/sheet1.xml").toString("utf8");
  const rels = new Map(
    [...files.get("xl/worksheets/_rels/sheet1.xml.rels").toString("utf8").matchAll(/<Relationship [^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((m) => [m[1], xmlText(m[2])]),
  );
  const links = new Map([...sheet.matchAll(/<hyperlink ref="([A-Z]+\d+)" r:id="([^"]+)"/g)].map((m) => [m[1], rels.get(m[2])]));
  const cell = (row, col) => {
    for (const c of row.matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      if (c[1] !== col) continue;
      const shared = /\bt="s"/.test(c[2]);
      const v = c[3]?.match(/<v>([^<]*)<\/v>/)?.[1];
      if (shared) return strings[Number(v)]?.trim() ?? "";
      return xmlText(c[3] ?? "").trim();
    }
    return "";
  };
  const sections = [];
  for (const m of sheet.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const [, r, row] = m;
    const topic = cell(row, "A");
    const title = cell(row, "B").replace(/\s+/g, " ");
    if (!topic || !title || topic === "Topic:" || !title || /^Questions by|^Youtube/i.test(title)) continue;
    let sec = sections[sections.length - 1];
    if (!sec || sec.title !== topic) sections.push((sec = { title: topic, problems: [] }));
    const url = links.get(`B${r}`) ?? null;
    const p = { title, sub: null, level: null, lc: null, cf: null, links: {} };
    if (url) {
      const lc = url.includes("leetcode.com/problems/") ? lcSlugFromUrl(url) : null;
      const cf = cfIdFromUrl(url);
      if (lc) p.lc = lc;
      else if (cf) p.cf = cf;
      else if (/geeksforgeeks\.org/.test(url)) p.links.gfg = url;
      else if (/naukri\.com\/code360|codingninjas\.com/.test(url)) p.links.code360 = url;
      else p.links.other = url;
    }
    sec.problems.push(p);
  }
  return sections;
}

// ---------- identity and topics ----------

function lcSlugFromUrl(url) {
  return url.match(/leetcode\.com\/problems\/([a-z0-9-]+)/)?.[1] ?? null;
}

function cfIdFromUrl(url) {
  const m = url.match(/codeforces\.com\/(?:contest|problemset\/problem)\/(\d+)\/(?:problem\/)?([A-Z]\d?)/);
  return m ? `${m[1]}-${m[2]}` : null;
}

function gfgKey(url) {
  const u = new URL(url);
  const parts = u.pathname.split("/").filter(Boolean);
  const i = parts.indexOf("problems");
  return `gfg:${i >= 0 ? parts[i + 1] : parts[parts.length - 1]}`;
}

/** Every identifier a problem is known by, best first (lc > cf > gfg > tuf > other url). */
function identifiers(p) {
  const ids = [];
  if (p.lc) ids.push(`lc:${p.lc}`);
  if (p.cf) ids.push(`cf:${p.cf}`);
  if (p.links.gfg) ids.push(gfgKey(p.links.gfg));
  if (p.tufSlug) ids.push(`tuf:${p.tufSlug}`);
  if (p.links.code360) ids.push(`url:${p.links.code360.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}`);
  if (p.links.other) ids.push(`url:${p.links.other.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}`);
  return ids;
}

// Section (or sub-section) title → unified topic, first match wins. Sub-sections are tried first.
const SECTION_TOPICS = [
  [/strings? \(advanced|string algo|pattern search|kmp|z-?function|rabin/i, "string-algorithms"],
  [/linked|\bdll\b|\bll\b/i, "linked-lists"],
  [/binary search tree|\bbst\b/i, "trees"],
  [/binary tree|\btrees?\b|traversal in constant/i, "trees"],
  [/^binary$|bit/i, "bitmasks"],
  [/binary search|searching|on answers/i, "binary-search"],
  [/sort/i, "sorting"],
  [/sliding window|two pointers?|2 pointer|window/i, "two-pointers"],
  [/prefix, infix|infix|postfix|monotonic|stack|queue/i, "stacks-queues"],
  [/heap|priority/i, "heaps"],
  [/shortest path|advanced graphs/i, "shortest-paths"],
  [/spanning tree|\bmst\b|disjoint|union/i, "dsu"],
  [/graph|cycles/i, "graphs"],
  [/dynamic programming|\bdp\b|\blis\b|\bmcm\b|1-d|2-d/i, "dp"],
  [/greedy|interval|scheduling/i, "greedy"],
  [/trie/i, "tries"],
  [/recursion|backtracking|subsequence pattern|subset/i, "recursion-backtracking"],
  [/hash/i, "arrays-hashing"],
  [/sieve|prime|number theory/i, "number-theory"],
  [/math|geometry/i, "math"],
  [/parenthes|string conversion|substring|string/i, "strings"],
  [/array|matrix|2d arrays/i, "arrays-hashing"],
  [/pattern|fundamentals of programming|language basics|logic building|time complexity|standard libraries|concept basics|implementation/i, "implementation"],
];

function sectionTopic(title) {
  if (!title) return null;
  for (const [re, id] of SECTION_TOPICS) if (re.test(title)) return id;
  return null;
}

// ---------- main ----------

const SHEETS = [
  {
    id: "striver-a2z",
    name: "Striver's A2Z DSA Sheet",
    short: "A2Z",
    creator: "Striver (takeUforward)",
    sourceUrl: "https://takeuforward.org/prep-hub/strivers-a2z-dsa-sheet",
    sectionLabel: "Step",
    load: async () => parseTuf(await download("a2z.html", "https://takeuforward.org/prep-hub/strivers-a2z-dsa-sheet"), "strivers-a2z-dsa-sheet"),
  },
  {
    id: "striver-sde",
    name: "Striver's SDE Sheet",
    short: "SDE",
    creator: "Striver (takeUforward)",
    sourceUrl: "https://takeuforward.org/prep-hub/strivers-sde-sheet",
    sectionLabel: "Day",
    load: async () => parseTuf(await download("sde.html", "https://takeuforward.org/prep-hub/strivers-sde-sheet"), "strivers-sde-sheet"),
  },
  {
    id: "neetcode-150",
    name: "NeetCode 150",
    short: "NeetCode 150",
    creator: "NeetCode",
    sourceUrl: "https://neetcode.io/practice",
    sectionLabel: "Section",
    load: async () => parseNeetcode(await download("neetcode.json", "https://raw.githubusercontent.com/neetcode-gh/leetcode/main/.problemSiteData.json")),
  },
  {
    id: "blind-75",
    name: "Blind 75",
    short: "Blind 75",
    creator: "Yangshun Tay (Blind, 2018)",
    sourceUrl: "https://www.teamblind.com/post/New-Year-Gift---Curated-List-of-Top-75-LeetCode-Questions-to-Save-Your-Time-OaM1orEU",
    sectionLabel: "Section",
    load: async () =>
      parseBlind(await download("blind.html", "https://www.teamblind.com/post/New-Year-Gift---Curated-List-of-Top-75-LeetCode-Questions-to-Save-Your-Time-OaM1orEU")),
  },
  {
    id: "babbar-450",
    name: "Love Babbar DSA 450",
    short: "Babbar 450",
    creator: "Love Babbar",
    sourceUrl: "https://drive.google.com/file/d/1FMdN_OCfOI0iAeDlqswCiC2DZzD4nPsb/view",
    sectionLabel: "Topic",
    load: async () => parseBabbar(await download("babbar.xlsx", "https://drive.google.com/uc?export=download&id=1FMdN_OCfOI0iAeDlqswCiC2DZzD4nPsb", true)),
  },
];

/**
 * LeetCode slugs the original sources still link that LeetCode has since renamed. Each new slug is
 * verified like any other, and the problem title on LeetCode must match the source's problem.
 */
const RENAMED = {
  "add-and-search-word-data-structure-design": "design-add-and-search-words-data-structure",
  // takeUforward's "KMP Algorithm or LPS array" links LeetCode 28 by its old slug.
  "implement-strstr": "find-the-index-of-the-first-occurrence-in-a-string",
};

const notes = new Map(SHEETS.map((s) => [s.id, []]));
const loaded = [];
for (const s of SHEETS) {
  try {
    const sections = await s.load();
    loaded.push({ ...s, sections });
    console.log(`${s.id}: ${sections.length} sections, ${sections.reduce((n, x) => n + x.problems.length, 0)} problems from the source`);
  } catch (e) {
    console.error(`${s.id}: source failed: ${e.message}`);
    notes.get(s.id).push(`Source could not be fetched (${e.message}); sheet not built.`);
  }
}

// Blind 75 lists one problem without a link ("Longest Common Subsequence"): look its title up as a
// slug; it's kept only if LeetCode has that exact problem under that title.
const derived = new Map();
for (const s of loaded) for (const sec of s.sections) for (const p of sec.problems) {
  if (p.linkless && !p.lc) {
    const slug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    derived.set(p, slug);
    p.lc = slug;
  }
  if (p.lc && RENAMED[p.lc]) p.lc = RENAMED[p.lc];
}

const lcSlugs = loaded.flatMap((s) => s.sections.flatMap((sec) => sec.problems.flatMap((p) => (p.lc ? [p.lc] : []))));
console.log(`Verifying ${new Set(lcSlugs).size} LeetCode slugs…`);
const lc = await lcQuestions(lcSlugs);
const cfIds = loaded.flatMap((s) => s.sections.flatMap((sec) => sec.problems.flatMap((p) => (p.cf ? [p.cf] : []))));
const cf = cfIds.length ? await cfProblemset() : new Map();
if (cfIds.length) console.log(`Verified against ${cf.size} Codeforces problemset problems`);

const LEVEL = { basic: "Easy", core: "Medium", pro: "Hard", Easy: "Easy", Medium: "Medium", Hard: "Hard" };

for (const s of loaded) {
  for (const sec of s.sections) {
    for (const p of sec.problems) {
      if (p.lc) {
        const m = lc.get(p.lc);
        if (!m) {
          notes.get(s.id).push(`"${p.title}" (${sec.title}): LeetCode slug "${p.lc}" not found, link dropped`);
          p.lc = null;
        } else {
          if (derived.has(p) && m.title.toLowerCase() !== p.title.toLowerCase()) {
            notes.get(s.id).push(`"${p.title}": no link in the source and no exact LeetCode match`);
            p.lc = null;
          } else {
            p.lcMeta = m;
            if (derived.has(p)) notes.get(s.id).push(`"${p.title}" has no link in the original; matched to LeetCode "${m.title}" by exact title`);
          }
        }
      }
      if (p.cf) {
        const m = cf.get(p.cf);
        if (!m) {
          notes.get(s.id).push(`"${p.title}": Codeforces problem ${p.cf} not found, link dropped`);
          p.cf = null;
        } else p.cfMeta = m;
      }
    }
  }
}

// One problem, every sheet: problems sharing any identifier are the same problem, under one key.
const parent = new Map();
const find = (x) => {
  while (parent.get(x) !== x) {
    parent.set(x, parent.get(parent.get(x)));
    x = parent.get(x);
  }
  return x;
};
const rank = (id) => ["lc:", "cf:", "gfg:", "tuf:", "url:"].findIndex((p) => id.startsWith(p));
const union = (a, b) => {
  const [ra, rb] = [find(a), find(b)];
  if (ra === rb) return;
  // The better identifier becomes the group's key.
  if (rank(ra) <= rank(rb)) parent.set(rb, ra);
  else parent.set(ra, rb);
};
for (const s of loaded) for (const sec of s.sections) for (const p of sec.problems) {
  p.ids = identifiers(p);
  for (const id of p.ids) if (!parent.has(id)) parent.set(id, id);
  for (let i = 1; i < p.ids.length; i++) union(p.ids[0], p.ids[i]);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
let unlinked = 0;
for (const s of loaded) {
  const sections = s.sections.map((sec) => ({
    title: sec.title,
    problems: sec.problems.map((p) => {
      const lead = sectionTopic(p.sub) ?? sectionTopic(sec.title);
      const tagTopics = p.lcMeta ? p.lcMeta.tags.flatMap((t) => lcTagIndex.get(t) ?? []) : p.cfMeta ? p.cfMeta.tags.flatMap((t) => cfTagIndex.get(t) ?? []) : [];
      const topicIds = [...new Set([...(lead ? [lead] : []), ...tagTopics])];
      const key = p.ids.length ? find(p.ids[0]) : null;
      if (!key) unlinked++;
      const out = {
        key: key ?? `${s.id}:${sec.title}:${p.title}`.toLowerCase().replace(/[^a-z0-9:]+/g, "-"),
        title: p.lcMeta?.title ?? p.cfMeta?.name ?? p.title,
      };
      if (p.sub) out.sub = p.sub;
      out.difficulty = p.lcMeta?.difficulty ?? LEVEL[p.level] ?? null;
      out.topics = topicIds;
      if (p.lc) out.lc = p.lc;
      if (p.cf) out.cf = p.cf;
      if (p.lcMeta?.isPaidOnly) out.premium = true;
      const links = Object.fromEntries(Object.entries(p.links).filter(([, v]) => v));
      if (Object.keys(links).length) out.links = links;
      // The source's own wording, when LeetCode's title differs (e.g. "Reverse a number" → "Reverse Integer").
      if (out.title !== p.title) out.sourceTitle = p.title;
      return out;
    }),
  }));
  const total = sections.reduce((n, x) => n + x.problems.length, 0);
  const sheetNotes = notes.get(s.id);
  const dropped = sheetNotes.filter((n) => n.includes("not found")).length;
  const doc = {
    $comment: "Generated by scripts/gen-sheets.mjs from the sheet's original source; regenerate, don't edit. Verified by npm run check:links.",
    id: s.id,
    name: s.name,
    short: s.short,
    creator: s.creator,
    sourceUrl: s.sourceUrl,
    sectionLabel: s.sectionLabel,
    fetched: TODAY,
    // Partial = something in the source couldn't be verified; the notes say what.
    status: dropped > 0 ? "partial" : "complete",
    notes: sheetNotes,
    sections,
  };
  // One problem per line keeps diffs readable.
  const head = JSON.stringify({ ...doc, sections: undefined }, null, 2).replace(/\n}$/, "");
  const body = sections
    .map((sec) => `    {\n      "title": ${JSON.stringify(sec.title)},\n      "problems": [\n${sec.problems.map((p) => `        ${JSON.stringify(p)}`).join(",\n")}\n      ]\n    }`)
    .join(",\n");
  fs.writeFileSync(`${OUT_DIR}/${s.id}.json`, `${head},\n  "sections": [\n${body}\n  ]\n}\n`);
  const withLc = sections.reduce((n, x) => n + x.problems.filter((p) => p.lc).length, 0);
  console.log(`Wrote ${s.id}.json: ${total} problems in ${sections.length} sections, ${withLc} on LeetCode, status ${doc.status}`);
  for (const n of sheetNotes) console.log(`  note: ${n}`);
}
if (unlinked) console.log(`${unlinked} problem(s) have no link in their source (kept, keyed by sheet and title).`);
