// Shared platform lookups for the data scripts (gen-sheets, check-links). Everything here asks the
// platforms themselves, so stored titles, difficulties and ids are verified, never typed from memory.

const UA = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};
const LC_HEADERS = { "Content-Type": "application/json", Referer: "https://leetcode.com/", Origin: "https://leetcode.com" };
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** fetch with a browser user agent and retries on network errors (CF, LC and YouTube drop connections now and then). */
export async function get(url, init = {}, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      return await fetch(url, { redirect: "follow", ...init, headers: { ...UA, ...(init.headers ?? {}) } });
    } catch (e) {
      if (i >= tries) throw e;
      await sleep(1500 * i);
    }
  }
}

export async function lcQuery(query) {
  for (let i = 1; ; i++) {
    const res = await get("https://leetcode.com/graphql", { method: "POST", headers: LC_HEADERS, body: JSON.stringify({ query }) });
    if (res.ok) return (await res.json()).data ?? {};
    // 429 / 5xx: back off and retry a few times before failing the whole run.
    if (i >= 4 || (res.status !== 429 && res.status < 500)) throw new Error(`LeetCode GraphQL HTTP ${res.status}`);
    await sleep(3000 * i);
  }
}

/**
 * LeetCode problems by slug: Map(slug → { title, difficulty, isPaidOnly, tags[] } | null). null = no such problem.
 * Batched 40 per request, with a pause between batches.
 */
export async function lcQuestions(slugs) {
  const unique = [...new Set(slugs)];
  const out = new Map();
  for (let i = 0; i < unique.length; i += 40) {
    const chunk = unique.slice(i, i + 40);
    const d = await lcQuery(
      "query{" +
        chunk.map((s, j) => `q${j}:question(titleSlug:${JSON.stringify(s)}){title titleSlug difficulty isPaidOnly topicTags{slug}}`).join(" ") +
        "}",
    );
    chunk.forEach((s, k) => {
      const q = d[`q${k}`];
      // LeetCode answers renamed slugs with the new problem; only an exact slug match counts.
      out.set(s, q && q.titleSlug === s ? { title: q.title, difficulty: q.difficulty, isPaidOnly: q.isPaidOnly, tags: q.topicTags.map((t) => t.slug) } : null);
    });
    await sleep(700);
  }
  return out;
}

let cfProblemsetCache = null;
/** Every Codeforces problemset problem: Map("contestId-index" → { name, rating, tags }). One API call, cached. */
export async function cfProblemset() {
  if (cfProblemsetCache) return cfProblemsetCache;
  const res = await get("https://codeforces.com/api/problemset.problems");
  const j = await res.json();
  if (j.status !== "OK") throw new Error(`Codeforces problemset.problems: ${j.comment ?? "error"}`);
  cfProblemsetCache = new Map(j.result.problems.map((p) => [`${p.contestId}-${p.index}`, { name: p.name, rating: p.rating ?? null, tags: p.tags }]));
  return cfProblemsetCache;
}

/** YouTube oEmbed for a video id: { ok, status, title, author } (oEmbed is 401/404 for private, deleted or non-embeddable videos). */
export async function ytOembed(id) {
  const url = `https://www.youtube.com/watch?v=${id}`;
  const res = await get(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`);
  if (!res.ok) return { ok: false, status: res.status, title: null, author: null };
  const j = await res.json();
  return { ok: true, status: res.status, title: j.title, author: j.author_name };
}

/** Runs `fn` over items with at most `n` in flight. */
export async function pool(items, n, fn) {
  const queue = [...items.entries()];
  const results = new Array(items.length);
  await Promise.all(
    Array.from({ length: n }, async () => {
      for (let e = queue.shift(); e; e = queue.shift()) results[e[0]] = await fn(e[1], e[0]);
    }),
  );
  return results;
}
