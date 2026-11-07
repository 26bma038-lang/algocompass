// Reads public YouTube pages the way a browser does, with no API key: a playlist's videos in order
// (the playlist page, then its "load more" continuations), and a channel's playlists (used to find
// playlist ids, never to invent them). Shared by fill-playlists.mjs and check-media.mjs.
import { get, sleep } from "./platforms.mjs";

// SOCS=CAI answers YouTube's cookie-consent page ("reject all"), which some regions get instead of
// the page itself.
const HEADERS = { Cookie: "SOCS=CAI" };

/** The page's ytInitialData and the web client version its continuations need. */
async function ytPage(url) {
  const html = await (await get(url, { headers: HEADERS })).text();
  const start = html.indexOf("var ytInitialData = ");
  if (start < 0) throw new Error(`no ytInitialData on ${url}`);
  const from = start + "var ytInitialData = ".length;
  const data = JSON.parse(html.slice(from, html.indexOf(";</script>", from)));
  const clientVersion = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1] ?? "2.20250101.00.00";
  return { data, clientVersion };
}

async function ytBrowse(continuation, clientVersion) {
  for (let i = 1; ; i++) {
    const res = await get("https://www.youtube.com/youtubei/v1/browse?prettyPrint=false", {
      method: "POST",
      headers: { ...HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ context: { client: { clientName: "WEB", clientVersion, hl: "en", gl: "US" } }, continuation }),
    });
    if (res.ok) return res.json();
    if (i >= 4) throw new Error(`YouTube browse HTTP ${res.status}`);
    await sleep(2000 * i);
  }
}

/** Every object under `o` that has key `k` (depth first, in document order). */
function findAll(o, k, out = []) {
  if (!o || typeof o !== "object") return out;
  if (Array.isArray(o)) {
    for (const x of o) findAll(x, k, out);
    return out;
  }
  if (k in o) out.push(o[k]);
  for (const key of Object.keys(o)) if (key !== k) findAll(o[key], k, out);
  return out;
}

const text = (t) => t?.simpleText ?? (t?.runs ?? []).map((r) => r.text).join("") ?? "";
/** The first continuation token under `o` (the command can be nested in an innertubeCommand). */
const continuationOf = (o) => findAll(o, "continuationCommand").find((c) => c.token)?.token ?? findAll(findAll(o, "continuationCommand"), "token")[0] ?? null;
/** "1:02:03" → 3723. */
const clockSeconds = (s) => (/^\d+(:\d\d)+$/.test(s ?? "") ? s.split(":").reduce((t, x) => t * 60 + Number(x), 0) : 0);

/**
 * The videos of one page of a playlist, in order, in either of the layouts YouTube serves: the
 * older playlistVideoRenderer rows or the newer lockupViewModel cards. Plus the next page's token.
 */
function readPlaylistPage(root) {
  const items = [];
  let unavailable = 0;
  let token = null;
  (function walk(o) {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o)) return o.forEach(walk);
    if (o.playlistVideoRenderer) {
      const r = o.playlistVideoRenderer;
      if (!r.videoId || r.isPlayable === false || !r.lengthSeconds) unavailable++;
      else items.push({ id: r.videoId, title: text(r.title), seconds: Number(r.lengthSeconds) });
      return;
    }
    if (o.lockupViewModel) {
      const l = o.lockupViewModel;
      if (l.contentType !== "LOCKUP_CONTENT_TYPE_VIDEO") return;
      const seconds = clockSeconds(findAll(l, "thumbnailBadgeViewModel")[0]?.text);
      if (!l.contentId || !seconds) unavailable++;
      else items.push({ id: l.contentId, title: l.metadata?.lockupMetadataViewModel?.title?.content ?? "", seconds });
      return;
    }
    // The playlist's own "load more" (comments have their own continuationItemRenderer elsewhere).
    if (o.continuationItemViewModel) return void (token ??= continuationOf(o.continuationItemViewModel));
    if (o.playlistVideoListRenderer) {
      walk(o.playlistVideoListRenderer.contents);
      const last = o.playlistVideoListRenderer.contents?.at(-1);
      if (last?.continuationItemRenderer) token ??= continuationOf(last);
      return;
    }
    if (o.continuationItemRenderer) return;
    for (const k of Object.keys(o)) walk(o[k]);
  })(root);
  return { items, unavailable, token };
}

/**
 * A playlist's videos in playlist order: { videos: [{ id, title, seconds }], unavailable, repeated }.
 * Private and deleted entries ("[Private video]") can't be played, so they're left out and counted;
 * a video listed twice is kept once, where it first appears.
 */
export async function playlistVideos(id) {
  const { data, clientVersion } = await ytPage(`https://www.youtube.com/playlist?list=${id}&hl=en&gl=US`);
  const main = findAll(data, "twoColumnBrowseResultsRenderer")[0];
  if (!main) throw new Error(`playlist ${id}: no video list (private, deleted or not a playlist)`);
  let page = readPlaylistPage(main);
  const all = [...page.items];
  let unavailable = page.unavailable;
  for (let n = 0; page.token && n < 60; n++) {
    const j = await ytBrowse(page.token, clientVersion);
    page = readPlaylistPage(findAll(j, "continuationItems"));
    all.push(...page.items);
    unavailable += page.unavailable;
  }
  if (!all.length && !unavailable) throw new Error(`playlist ${id}: no videos found (YouTube's page layout may have changed)`);
  const seen = new Set();
  const videos = all.filter((v) => !seen.has(v.id) && seen.add(v.id));
  return { videos, unavailable, repeated: all.length - videos.length };
}

/** A channel's public playlists: [{ id, title, count }] (count as the channel page shows it). */
export async function channelPlaylists(handle) {
  const { data, clientVersion } = await ytPage(`https://www.youtube.com/${handle}/playlists?hl=en&gl=US`);
  const out = [];
  const take = (root) => {
    for (const l of findAll(root, "lockupViewModel")) {
      if (!["LOCKUP_CONTENT_TYPE_PLAYLIST", "LOCKUP_CONTENT_TYPE_COURSE"].includes(l.contentType)) continue;
      const badge = findAll(l, "thumbnailBadgeViewModel")[0]?.text ?? "";
      out.push({ id: l.contentId, title: l.metadata?.lockupMetadataViewModel?.title?.content ?? "", count: Number(badge.replace(/\D/g, "")) || null });
    }
    for (const r of findAll(root, "gridPlaylistRenderer")) out.push({ id: r.playlistId, title: text(r.title), count: Number(text(r.videoCountText).replace(/\D/g, "")) || null });
  };
  const grid = findAll(data, "richGridRenderer")[0] ?? findAll(data, "gridRenderer")[0] ?? data;
  take(grid);
  let token = continuationOf((grid.contents ?? grid.items ?? []).at?.(-1));
  for (let page = 0; token && page < 20; page++) {
    const j = await ytBrowse(token, clientVersion);
    const items = findAll(j, "continuationItems")[0] ?? [];
    take(items);
    token = continuationOf(items.at(-1));
  }
  return out;
}

/** oEmbed for a playlist: { ok, status, title, author } (404 for private or deleted playlists). */
export async function ytPlaylistOembed(id) {
  const url = `https://www.youtube.com/playlist?list=${id}`;
  const res = await get(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`);
  if (!res.ok) return { ok: false, status: res.status, title: null, author: null };
  const j = await res.json();
  return { ok: true, status: res.status, title: j.title, author: j.author_name };
}

/**
 * The language YouTube's automatic captions were made in ("en", "hi"), which is the language the
 * video is spoken in; null when the video has no automatic captions.
 */
export async function spokenLanguage(videoId) {
  const html = await (await get(`https://www.youtube.com/watch?v=${videoId}&hl=en`, { headers: HEADERS })).text();
  const tracks = html.match(/"captionTracks":(\[.*?\])/)?.[1];
  if (!tracks) return null;
  try {
    return JSON.parse(tracks).find((t) => t.kind === "asr")?.languageCode ?? null;
  } catch {
    return null;
  }
}
