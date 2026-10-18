// Verifies every link the app ships: src/data/resources.json and the curated LeetCode lists.
// Usage: npm run check:links            (exit code 1 if anything fails)
//        npm run check:links -- --quiet (only print failures)
//
// How each kind of link is checked:
// - YouTube videos: YouTube's oEmbed endpoint (a watch page answers 200 even for deleted videos).
// - Codeforces blog entries: the official API (blogEntry.view). codeforces.com pages sit behind a
//   Cloudflare challenge that answers 403 to scripts, so a plain GET proves nothing either way.
// - LeetCode problem lists and problems: LeetCode's GraphQL (same Cloudflare issue as above).
// - Everything else: GET with redirects followed; any 2xx passes. Redirects are reported so the
//   stored URL can be updated to the final one.
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const quiet = process.argv.includes("--quiet");
const resources = JSON.parse(fs.readFileSync(`${root}src/data/resources.json`, "utf8"));
const lcLists = JSON.parse(fs.readFileSync(`${root}src/data/lc_lists.json`, "utf8"));
const topics = JSON.parse(fs.readFileSync(`${root}src/data/topics.json`, "utf8")).topics;

const UA = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};
const LC_HEADERS = { "Content-Type": "application/json", Referer: "https://leetcode.com/", Origin: "https://leetcode.com" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** fetch with retries on network errors (both CF and LC drop connections now and then). */
async function get(url, init = {}, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      return await fetch(url, { redirect: "follow", ...init, headers: { ...UA, ...(init.headers ?? {}) } });
    } catch (e) {
      if (i >= tries) throw e;
      await sleep(1500 * i);
    }
  }
}

async function lcQuery(query) {
  const res = await get("https://leetcode.com/graphql", { method: "POST", headers: LC_HEADERS, body: JSON.stringify({ query }) });
  if (!res.ok) throw new Error(`LeetCode GraphQL HTTP ${res.status}`);
  return (await res.json()).data ?? {};
}

// Codeforces allows about one API call every 2 seconds.
let lastCf = 0;
async function cfApi(method, params) {
  const wait = lastCf + 2100 - Date.now();
  if (wait > 0) await sleep(wait);
  lastCf = Date.now();
  const res = await get(`https://codeforces.com/api/${method}?${new URLSearchParams(params)}`);
  return res.json();
}

const plain = (s) => s.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").trim();

/** Returns { ok, detail } for one URL. `detail` is the resolved title or the failure reason. */
async function check(url) {
  const u = new URL(url);
  const host = u.hostname.replace(/^www\./, "");

  if (host === "youtube.com" && u.pathname === "/watch") {
    const res = await get(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`);
    if (!res.ok) return { ok: false, detail: `oEmbed HTTP ${res.status} (deleted, private or wrong id)` };
    const j = await res.json();
    return { ok: true, detail: `${j.title} · ${j.author_name}` };
  }

  if (host === "codeforces.com") {
    const blog = u.pathname.match(/^\/blog\/entry\/(\d+)\/?$/);
    if (blog) {
      const j = await cfApi("blogEntry.view", { blogEntryId: blog[1] });
      return j.status === "OK" ? { ok: true, detail: `${plain(j.result.title)} · ${j.result.authorHandle}` } : { ok: false, detail: j.comment ?? "API error" };
    }
    return { ok: false, detail: "codeforces.com page that can't be verified (Cloudflare); use a blog entry or the API-checked shapes" };
  }

  if (host === "leetcode.com") {
    const list = u.pathname.match(/^\/problem-list\/([a-z0-9-]+)\/?$/);
    if (list) {
      const d = await lcQuery(`query{t:topicTag(slug:${JSON.stringify(list[1])}){name}}`);
      return d.t ? { ok: true, detail: `${d.t.name} problem list` } : { ok: false, detail: "no such LeetCode tag" };
    }
    const problem = u.pathname.match(/^\/problems\/([a-z0-9-]+)\/?$/);
    if (problem) {
      const d = await lcQuery(`query{q:question(titleSlug:${JSON.stringify(problem[1])}){title}}`);
      return d.q ? { ok: true, detail: d.q.title } : { ok: false, detail: "no such LeetCode problem" };
    }
    return { ok: false, detail: "leetcode.com page that can't be verified (Cloudflare); use a problem or problem-list URL" };
  }

  // Plain web page: GET (some sites refuse HEAD), follow redirects, accept 2xx.
  const res = await get(url);
  const body = await res.text();
  if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
  const title = plain((body.match(/<title[^>]*>([^<]*)/i) ?? [])[1] ?? "");
  const moved = res.url.replace(/\/$/, "") !== url.replace(/\/$/, "");
  return { ok: true, detail: `${title || "(no title)"}${moved ? `  [redirects to ${res.url}]` : ""}` };
}

let failures = 0;
const report = (ok, label, detail) => {
  if (!ok) failures++;
  if (ok && quiet) return;
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}\n      ${detail}`);
};

// ---- 1. Structure: every topic has learn (article + video), practice and deeper. ----
console.log("Checking resources.json structure…");
for (const t of topics) {
  const r = resources.topics[t.id];
  const problems = [];
  if (!r) problems.push("missing");
  else {
    const kinds = (r.learn ?? []).map((x) => x.kind);
    if (!kinds.includes("article") || !kinds.includes("video")) problems.push("learn needs one article and one video");
    if (!(r.practice ?? []).length) problems.push("practice is empty");
    if (!(r.deeper ?? []).length) problems.push("deeper is empty");
  }
  if (problems.length) report(false, `topic ${t.id}`, problems.join("; "));
}
for (const id of Object.keys(resources.topics)) {
  if (!topics.some((t) => t.id === id)) report(false, `topic ${id}`, "not in topics.json");
}

// ---- 2. Every resource URL. ----
const entries = Object.entries(resources.topics).flatMap(([topic, tiers]) =>
  ["learn", "practice", "deeper"].flatMap((tier) => (tiers[tier] ?? []).map((r) => ({ topic, tier, ...r }))),
);
const listUrls = Object.values(lcLists.lists).filter((l) => l.url).map((l) => ({ topic: "lists", tier: "lc_lists", title: l.name, url: l.url }));
const all = [...entries, ...listUrls];
const unique = [...new Map(all.map((e) => [e.url, e])).values()];
console.log(`Checking ${unique.length} unique URLs (${all.length} entries)…`);

const results = new Map();
// Codeforces calls are serialized by cfApi; everything else runs 6 at a time.
const queue = [...unique];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    for (let e = queue.shift(); e; e = queue.shift()) {
      try {
        results.set(e.url, await check(e.url));
      } catch (err) {
        results.set(e.url, { ok: false, detail: `network error: ${err.cause?.code ?? err.message}` });
      }
    }
  }),
);
for (const e of all) {
  const r = results.get(e.url);
  report(r.ok, `${e.topic} · ${e.tier} · ${e.title}  <${e.url}>`, r.detail);
}

// ---- 3. Curated LeetCode problems: exist, free, and match the stored title and difficulty. ----
const problems = lcLists.problems;
const slugs = [...new Set(problems.map((p) => p.slug))];
console.log(`Checking ${slugs.length} curated LeetCode problems…`);
const meta = new Map();
for (let i = 0; i < slugs.length; i += 40) {
  const chunk = slugs.slice(i, i + 40);
  const d = await lcQuery("query{" + chunk.map((s, j) => `q${j}:question(titleSlug:${JSON.stringify(s)}){title difficulty isPaidOnly}`).join(" ") + "}");
  chunk.forEach((s, k) => meta.set(s, d[`q${k}`] ?? null));
  await sleep(600);
}
let lcOk = 0;
for (const p of problems) {
  const m = meta.get(p.slug);
  const issues = [];
  if (!m) issues.push("not found");
  else {
    if (m.isPaidOnly) issues.push("premium");
    if (m.title !== p.title) issues.push(`title is "${m.title}"`);
    if (m.difficulty !== p.difficulty) issues.push(`difficulty is ${m.difficulty}`);
  }
  if (issues.length) report(false, `lc_lists · ${p.topic} · ${p.slug}`, issues.join("; "));
  else lcOk++;
}
if (!quiet) console.log(`ok    ${lcOk}/${problems.length} curated LeetCode problems match LeetCode`);

// ---- 4. Sheets (src/data/sheets/*.json): every LeetCode slug and Codeforces id exists and matches. ----
const { checkSheets } = await import("./lib/check-sheets.mjs");
failures += await checkSheets({ root, report, quiet, deep: process.argv.includes("--deep") });

// ---- 5. Beginner Path problems and every video (oEmbed: 200, title and channel match). ----
const { checkMedia } = await import("./lib/check-media.mjs");
failures += await checkMedia({ root, report, quiet });

console.log(failures ? `\n${failures} problem(s) found.` : "\nAll links verified.");
process.exit(failures ? 1 : 0);
