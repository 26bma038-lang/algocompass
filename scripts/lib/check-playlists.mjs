// Verifies the full YouTube playlists (src/data/playlists.json, v1.6). Used by check-links.mjs.
// - Every playlist: YouTube oEmbed answers 200 (it refuses private and deleted playlists), and its
//   title and author_name match the stored title and channel exactly.
// - Its codeLang is the one src/data/code-langs.json gives it (same rules as single videos).
// - The playlist page is read again; when it now has a different number of videos than stored (the
//   channel added or removed some), that's a warning, not a failure: npm run fill:playlists updates it.
import fs from "node:fs";
import { deriveCodeLang, loadTable, playlistRoles, tagProblems } from "./code-lang.mjs";
import { pool } from "./platforms.mjs";
import { playlistVideos, ytPlaylistOembed } from "./youtube.mjs";

export async function checkPlaylists({ root, report, quiet }) {
  const { playlists } = JSON.parse(fs.readFileSync(`${root}src/data/playlists.json`, "utf8"));
  const table = loadTable(root);
  let failures = 0;
  const fail = (label, detail) => {
    failures++;
    report(false, label, detail);
  };
  console.log(`Checking ${playlists.length} playlists with YouTube oEmbed and their playlist pages…`);
  const answers = await pool(playlists, 4, async (p) => {
    try {
      const o = await ytPlaylistOembed(p.id);
      let count = null;
      // YouTube now and then answers a page without its data; try three times. A page that still
      // can't be read is a warning below; oEmbed decides pass or fail.
      for (let i = 0; i < 3 && count === null; i++) {
        try {
          count = (await playlistVideos(p.id)).videos.length;
        } catch {
          // next try
        }
      }
      return { o, count };
    } catch (e) {
      return { o: { ok: false, status: `network error: ${e.cause?.code ?? e.message}` }, count: null };
    }
  });
  let ok = 0;
  const changed = [];
  playlists.forEach((p, i) => {
    const { o, count } = answers[i];
    const label = `playlist · ${p.lang} · ${p.id}`;
    const tags = tagProblems(p, deriveCodeLang({ id: p.id, title: p.title ?? "", channel: p.channel ?? "" }, playlistRoles(p), table));
    if (!o.ok) fail(label, `oEmbed ${o.status} (private, deleted or wrong id)`);
    else if (o.title !== p.title) fail(label, `title on YouTube is "${o.title}", stored "${p.title}" (run npm run fill:playlists)`);
    else if (o.author !== p.channel) fail(label, `channel on YouTube is "${o.author}", stored "${p.channel}"`);
    else if (!p.videos?.length) fail(label, "no videos stored (run npm run fill:playlists)");
    else if (tags.length) fail(label, tags.join("; ").replace("npm run tag:videos", "npm run fill:playlists"));
    else ok++;
    if (o.ok && count === null) changed.push(`${p.title}: couldn't read the playlist page`);
    else if (count !== null && count !== p.videos?.length) changed.push(`${p.title}: ${p.videos?.length ?? 0} videos stored, ${count} on YouTube now`);
  });
  if (!quiet) {
    const videos = playlists.reduce((n, p) => n + (p.videos?.length ?? 0), 0);
    console.log(`ok    ${ok}/${playlists.length} playlists match YouTube (title, channel and codeLang); ${videos} videos stored`);
  }
  for (const c of changed) console.log(`warn  ${c} (run npm run fill:playlists)`);
  return failures;
}
