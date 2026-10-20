// Verifies the Beginner Path (src/data/path/beginner-path.json) and every video the app ships.
// Used by check-links.mjs.
// - Every video (Beginner Path lessons and resources.json topic videos): YouTube oEmbed answers 200
//   (it refuses deleted, private and non-embeddable videos), and its title and author_name match the
//   stored title and channel exactly.
// - Every path problem: the LeetCode slug exists with the stored title, is Easy and free; a
//   Codeforces id exists in problemset.problems with the stored name.
import fs from "node:fs";
import { cfProblemset, lcQuestions, pool, ytOembed } from "./platforms.mjs";

export async function checkMedia({ root, report, quiet }) {
  const path = JSON.parse(fs.readFileSync(`${root}src/data/path/beginner-path.json`, "utf8"));
  const resources = JSON.parse(fs.readFileSync(`${root}src/data/resources.json`, "utf8"));
  let failures = 0;
  const fail = (label, detail) => {
    failures++;
    report(false, label, detail);
  };

  // ---- videos ----
  const videos = [
    ...path.steps.flatMap((s) => Object.entries(s.videos).flatMap(([lang, list]) => list.map((v) => ({ ...v, where: `path · ${s.title} · ${lang}` })))),
    ...Object.entries(resources.topics).flatMap(([topic, t]) => (t.videos ?? []).map((v) => ({ ...v, where: `resources · ${topic} · ${v.lang}` }))),
  ];
  const ids = [...new Set(videos.map((v) => v.id))];
  console.log(`Checking ${ids.length} videos with YouTube oEmbed (${videos.length} uses)…`);
  const answers = new Map();
  const got = await pool(ids, 6, async (id) => {
    try {
      return await ytOembed(id);
    } catch (e) {
      return { ok: false, status: `network error: ${e.cause?.code ?? e.message}` };
    }
  });
  ids.forEach((id, i) => answers.set(id, got[i]));
  let vOk = 0;
  for (const v of videos) {
    const m = answers.get(v.id);
    const label = `${v.where} · ${v.id}`;
    if (!m.ok) fail(label, `oEmbed ${m.status} (deleted, private or not embeddable)`);
    else if (m.title !== v.title) fail(label, `title on YouTube is "${m.title}", stored "${v.title}"`);
    else if (m.author !== v.channel) fail(label, `channel on YouTube is "${m.author}", stored "${v.channel}"`);
    else vOk++;
  }
  if (!quiet) console.log(`ok    ${vOk}/${videos.length} video uses match YouTube (title and channel)`);

  // ---- path problems ----
  const problems = path.steps.flatMap((s) => s.problems.map((p) => ({ ...p, step: s.title })));
  const lc = await lcQuestions(problems.flatMap((p) => (p.lc ? [p.lc] : [])));
  const cf = problems.some((p) => p.cf) ? await cfProblemset() : new Map();
  let pOk = 0;
  for (const p of problems) {
    const label = `path · ${p.step} · ${p.title}`;
    if (p.lc) {
      const m = lc.get(p.lc);
      if (!m) fail(label, `LeetCode has no problem "${p.lc}"`);
      else if (m.title !== p.title) fail(label, `LeetCode title is "${m.title}"`);
      else if (m.difficulty !== "Easy") fail(label, `is ${m.difficulty}; lessons use Easy problems`);
      else if (m.isPaidOnly) fail(label, "is LeetCode Premium");
      else pOk++;
    } else if (p.cf) {
      const m = cf.get(p.cf);
      if (!m) fail(label, `Codeforces has no problem ${p.cf}`);
      else if (m.name !== p.title) fail(label, `Codeforces name is "${m.name}"`);
      else pOk++;
    } else fail(label, "no LeetCode or Codeforces link");
  }
  if (!quiet) console.log(`ok    ${pOk}/${problems.length} Beginner Path problems match LeetCode / Codeforces`);
  return failures;
}
