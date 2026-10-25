/** Contest helpers shared by Today and Contests (v1.4: the strip itself moved to Contests). */
import { openExternal } from "@/lib/openExternal";
import type { Contest } from "@/data/types";

export function countdown(start: number, nowMs: number): string {
  const s = start - Math.floor(nowMs / 1000);
  if (s <= 0) return "Live now";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `in ${d}d ${h}h`;
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}

export const when = (t: number) =>
  new Date(t * 1000).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** The platform label already says "Codeforces", so drop it from the round name. */
export const shortName = (c: Contest) => (c.platform === "cf" ? c.name.replace(/^Codeforces\s+/i, "") : c.name);

export const openContest = openExternal;

