/** Command palette ranking (cmdk `filter`). Pure, so it's unit-tested on its own. */

/**
 * Ranking: a name that starts with what you typed beats a word inside it, which beats an exact tag
 * ("dp"), an initialism ("dp" → Dynamic programming), a tag prefix, a substring, and last a loose
 * in-order match on the name. Keywords never match loosely, so "dp" can't pick "daily problems".
 */
export function paletteScore(value: string, search: string, keywords: readonly string[] = []): number {
  const q = search.trim().toLowerCase();
  if (!q) return 1;
  const v = value.toLowerCase();
  const words = v.split(/[^a-z0-9]+/).filter(Boolean);
  const kws = keywords.map((k) => k.toLowerCase());
  if (v.startsWith(q)) return 1;
  if (words.some((w) => w.startsWith(q))) return 0.9;
  if (kws.includes(q)) return 0.85;
  if (words.map((w) => w[0]).join("").startsWith(q)) return 0.8;
  if (kws.some((k) => k.startsWith(q))) return 0.7;
  if (v.includes(q)) return 0.6;
  let i = 0;
  for (const ch of v) if (ch === q[i]) i++;
  return i === q.length ? 0.2 : 0;
}
