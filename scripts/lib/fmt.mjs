// The compact JSON layout of the hand-curated data files (one record per line when it fits), shared
// by fill-media.mjs and tag-videos.mjs so a rewrite never reflows the whole file.
export function fmt(v, ind = "") {
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
