// Fills the hand-picked YouTube playlists in src/data/playlists.json from YouTube itself, so nothing
// is typed from memory (v1.6). The curated fields per playlist are id, lang (en | hi), scope (course
// = a full DSA course, topic = one topic), kind (lectures | walkthroughs) and topics; this script
// writes the rest:
// - title and channel from YouTube oEmbed (a playlist oEmbed refuses is reported and fails the run);
// - every video in playlist order, with its title and length, from the public playlist page and its
//   "load more" pages (no API key); private and deleted entries are left out and counted;
// - codeLang (and alsoCodeLang) from src/data/code-langs.json, by the same rules as single videos;
// - a spoken-language check: YouTube's automatic captions name the language of three sampled
//   videos, and a playlist whose samples say another language than `lang` is printed as a warning.
//   (Auto-detection is noisy on Indian English, so it never changes the data on its own.)
// Usage: npm run fill:playlists              (all)
//        npm run fill:playlists -- <id> …    (only these)
//        npm run fill:playlists -- --no-lang (skip the spoken-language check)
// Then npm run check:links verifies the result.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { deriveCodeLang, loadTable, playlistRoles } from "./lib/code-lang.mjs";
import { fmt } from "./lib/fmt.mjs";
import { pool } from "./lib/platforms.mjs";
import { playlistVideos, spokenLanguage, ytPlaylistOembed } from "./lib/youtube.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const FILE = `${root}src/data/playlists.json`;
const doc = JSON.parse(fs.readFileSync(FILE, "utf8"));
const topics = new Set(JSON.parse(fs.readFileSync(`${root}src/data/topics.json`, "utf8")).topics.map((t) => t.id));
const table = loadTable(root);
const args = process.argv.slice(2);
const only = new Set(args.filter((a) => !a.startsWith("--")));
const checkLang = !args.includes("--no-lang");

let failed = 0;
const fail = (msg) => {
  failed++;
  console.error(`FAIL ${msg}`);
};
const todo = doc.playlists.filter((p) => !only.size || only.has(p.id));
console.log(`Reading ${todo.length} playlists from YouTube…`);

await pool(todo, 3, async (p) => {
  for (const t of p.topics) if (!topics.has(t)) fail(`${p.id}: unknown topic "${t}"`);
  if (!["en", "hi"].includes(p.lang) || !["course", "topic"].includes(p.scope) || !["lectures", "walkthroughs"].includes(p.kind)) fail(`${p.id}: bad lang, scope or kind`);
  const o = await ytPlaylistOembed(p.id);
  if (!o.ok) return fail(`${p.id}: oEmbed HTTP ${o.status} (private, deleted or wrong id)`);
  let list;
  for (let i = 1; ; i++) {
    try {
      list = await playlistVideos(p.id);
      break;
    } catch (e) {
      if (i >= 3) return fail(`${p.id}: ${e.message}`);
    }
  }
  if (!list.videos.length) return fail(`${p.id}: no playable videos`);
  p.title = o.title;
  p.channel = o.author;
  const d = deriveCodeLang({ id: p.id, title: p.title, channel: p.channel }, playlistRoles(p), table);
  if (d.error) return fail(`${p.id}: ${d.error}`);
  p.codeLang = d.codeLang;
  if (d.alsoCodeLang.length) p.alsoCodeLang = d.alsoCodeLang;
  else delete p.alsoCodeLang;
  p.videos = list.videos.map((v) => ({ id: v.id, title: v.title, minutes: Math.max(1, Math.round(v.seconds / 60)) }));
  const notes = [];
  if (list.unavailable) notes.push(`${list.unavailable} private or deleted left out`);
  if (list.repeated) notes.push(`${list.repeated} repeated left out`);
  if (checkLang) {
    const sample = [...new Set([p.videos[0], p.videos[Math.floor(p.videos.length / 2)], p.videos.at(-1)])];
    const heard = (await Promise.all(sample.map((v) => spokenLanguage(v.id).catch(() => null)))).map((l) => l?.slice(0, 2) ?? null);
    const en = heard.filter((l) => l === "en").length;
    const hi = heard.filter((l) => l === "hi").length;
    const other = p.lang === "en" ? hi : en;
    if (other > (p.lang === "en" ? en : hi)) console.error(`WARN ${p.id} (${p.title}): stored ${p.lang}, automatic captions heard ${heard.map((l) => l ?? "-").join("/")}`);
  }
  console.log(`ok   ${p.lang} ${p.codeLang.padEnd(7)} ${String(p.videos.length).padStart(3)} videos  ${p.title} · ${p.channel}${notes.length ? `  (${notes.join(", ")})` : ""}`);
});

doc.playlists = doc.playlists.map(({ id, lang, scope, kind, topics, title, channel, codeLang, alsoCodeLang, videos }) => ({
  id,
  lang,
  scope,
  kind,
  topics,
  title,
  channel,
  codeLang,
  ...(alsoCodeLang ? { alsoCodeLang } : {}),
  videos,
}));
fs.writeFileSync(FILE, `${fmt(doc)}\n`);

// Summary: playlists per language and topic, total videos.
const filled = doc.playlists.filter((p) => p.videos?.length);
const total = filled.reduce((n, p) => n + p.videos.length, 0);
const unique = new Set(filled.flatMap((p) => p.videos.map((v) => v.id))).size;
console.log(`\n${filled.length} playlists, ${total} videos (${unique} distinct).`);
for (const lang of ["en", "hi"]) {
  const mine = filled.filter((p) => p.lang === lang);
  const per = {};
  for (const p of mine.filter((x) => x.scope === "topic")) for (const t of p.topics) per[t] = (per[t] ?? 0) + 1;
  console.log(`${lang}: ${mine.length} playlists (${mine.filter((p) => p.scope === "course").length} full courses); by topic: ${Object.entries(per).map(([t, n]) => `${t} ${n}`).join(", ")}`);
  console.log(`    no topic playlist: ${[...topics].filter((t) => !per[t]).join(", ") || "none"}`);
}
process.exit(failed ? 1 : 0);
