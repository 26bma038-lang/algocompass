// What each video codes in (v1.5), from the committed table src/data/code-langs.json.
// Shared by scripts/tag-videos.mjs (writes the tags) and check-media.mjs (fails on a missing,
// unknown or out-of-date tag). See the table's $comment for the rules.
import fs from "node:fs";

export const VIDEO_CODES = ["concept", "cpp", "java", "python", "js"];
export const CODE_LANGS = VIDEO_CODES.slice(1);

export function loadTable(root) {
  return JSON.parse(fs.readFileSync(`${root}src/data/code-langs.json`, "utf8"));
}

/** Every video the app ships, once per use: { v, where, roles } (roles = every role the id has anywhere). */
export function videoUses(path, resources) {
  const uses = [
    ...path.steps.flatMap((s) => Object.entries(s.videos).flatMap(([lang, list]) => list.map((v) => ({ v, where: `path · ${s.title} · ${lang}`, role: v.role })))),
    ...Object.entries(resources.topics).flatMap(([topic, t]) => (t.videos ?? []).map((v) => ({ v, where: `resources · ${topic} · ${v.lang}`, role: v.role }))),
  ];
  const roles = new Map();
  for (const u of uses) roles.set(u.v.id, new Set([...(roles.get(u.v.id) ?? []), u.role]));
  return uses.map((u) => ({ ...u, roles: roles.get(u.v.id) }));
}

/**
 * The tag for one video: { codeLang, alsoCodeLang } or { error }. `roles` is every role the video
 * has in the catalog and the path.
 */
export function deriveCodeLang(v, roles, table) {
  const override = table.overrides?.[v.id];
  if (override) return { codeLang: override.codeLang, alsoCodeLang: [] };
  const named = table.titleRules
    .map((r) => ({ lang: r.lang, at: v.title.search(new RegExp(r.pattern, "i")) }))
    .filter((m) => m.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((m) => m.lang);
  const langs = [...new Set(named)];
  if (langs.length) return { codeLang: langs[0], alsoCodeLang: langs.slice(1) };
  const ch = table.channels?.[v.channel];
  if (!ch) return { error: `channel "${v.channel}" isn't in src/data/code-langs.json` };
  if (!ch.codes) return { codeLang: "concept", alsoCodeLang: [] };
  const walkthrough = roles.has("walkthrough") || new RegExp(table.walkthroughTitle, "i").test(v.title);
  if (ch.when === "always" || walkthrough) return { codeLang: ch.codes, alsoCodeLang: [] };
  return { codeLang: "concept", alsoCodeLang: [] };
}

/** Problems with one video's stored tag, in words (empty when it's right). */
export function tagProblems(v, derived) {
  if (derived.error) return [derived.error];
  const out = [];
  if (v.codeLang === undefined) out.push("no codeLang tag (run npm run tag:videos)");
  else if (!VIDEO_CODES.includes(v.codeLang)) out.push(`unknown codeLang "${v.codeLang}" (use ${VIDEO_CODES.join(", ")})`);
  else if (v.codeLang !== derived.codeLang) out.push(`codeLang is "${v.codeLang}", the table says "${derived.codeLang}" (run npm run tag:videos)`);
  const also = v.alsoCodeLang ?? [];
  if (also.some((l) => !CODE_LANGS.includes(l))) out.push(`unknown alsoCodeLang ${JSON.stringify(also)}`);
  else if (also.join(",") !== derived.alsoCodeLang.join(",")) out.push(`alsoCodeLang is ${JSON.stringify(also)}, the table says ${JSON.stringify(derived.alsoCodeLang)}`);
  return out;
}
