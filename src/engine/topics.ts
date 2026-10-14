import topicsData from "@/data/topics.json";
import prereqData from "@/data/prerequisites.json";

export interface Topic {
  id: string;
  name: string;
  cfTags: string[];
  lcTags: string[];
}

export const TOPICS: readonly Topic[] = topicsData.topics;
export const TOPIC_BY_ID: ReadonlyMap<string, Topic> = new Map(TOPICS.map((t) => [t.id, t]));
export const PREREQUISITES: Readonly<Record<string, string[]>> = prereqData.prerequisites;

function index(key: "cfTags" | "lcTags"): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const t of TOPICS) {
    for (const tag of t[key]) map.set(tag, [...(map.get(tag) ?? []), t.id]);
  }
  return map;
}

const CF_INDEX = index("cfTags");
const LC_INDEX = index("lcTags");

/** Topic ids for a Codeforces tag (e.g. "dfs and similar"). Unknown tags map to nothing. */
export function topicsForCfTag(tag: string): string[] {
  return CF_INDEX.get(tag.trim().toLowerCase()) ?? [];
}

/** Topic ids for a LeetCode topic slug (e.g. "dynamic-programming"). */
export function topicsForLcTag(slug: string): string[] {
  return LC_INDEX.get(slug.trim().toLowerCase()) ?? [];
}

/** Distinct topics covered by a set of tags. */
export function topicsForTags(tags: readonly string[], platform: "cf" | "lc"): string[] {
  const lookup = platform === "cf" ? topicsForCfTag : topicsForLcTag;
  return [...new Set(tags.flatMap(lookup))];
}

/** Topics in dependency order (prerequisites first). Throws on a cycle. */
export function topologicalOrder(): string[] {
  const order: string[] = [];
  const state = new Map<string, "visiting" | "done">();
  const visit = (id: string, path: string[]) => {
    if (state.get(id) === "done") return;
    if (state.get(id) === "visiting") throw new Error(`Prerequisite cycle: ${[...path, id].join(" → ")}`);
    state.set(id, "visiting");
    for (const p of PREREQUISITES[id] ?? []) visit(p, [...path, id]);
    state.set(id, "done");
    order.push(id);
  };
  for (const t of TOPICS) visit(t.id, []);
  return order;
}
