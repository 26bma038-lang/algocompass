import type { Standing } from "./standing";
import { STATUS_THRESHOLDS, type TopicStatus, type TopicStrength } from "./strength";
import { PREREQUISITES, TOPIC_BY_ID } from "./topics";

/** Status order, lowest to highest. A move up this ladder is an unlock/promotion. */
export const STATUS_ORDER: readonly TopicStatus[] = ["Locked", "Untouched", "Weak", "Developing", "Strong", "Mastered"];

export type TreeFilter = "all" | "unlocked" | "weak" | "blind";

// A type alias (not an interface) so it satisfies React Flow node data: Record<string, unknown>.
export type TreeNodeModel = {
  id: string;
  name: string;
  score: number;
  status: TopicStatus;
  /** One of "Work on next" in Where you stand. */
  workOnNext: boolean;
  /** Never solved, but common at your rating. */
  blindSpot: boolean;
  /** Status differs from the last time you looked at the tree (after a sync). */
  changedFrom: TopicStatus | null;
};

export interface TreeEdgeModel {
  id: string;
  source: string;
  target: string;
  /** The parent is strong enough to unlock the child. */
  lit: boolean;
}

/** A prerequisite unlocks its children once it reaches Developing (same rule as the Locked status). */
export const unlocksChildren = (parent: Pick<TopicStrength, "score">) => parent.score >= STATUS_THRESHOLDS.developing;

export function buildSkillTree(
  topics: readonly TopicStrength[],
  standing: Standing,
  previous: Readonly<Record<string, TopicStatus>> | null,
): { nodes: TreeNodeModel[]; edges: TreeEdgeModel[] } {
  const next = new Set(standing.weaknesses.map((w) => w.topicId));
  const blind = new Set(standing.blindSpots.map((b) => b.topicId));
  const byId = new Map(topics.map((t) => [t.topicId, t]));

  const nodes = topics.map((t): TreeNodeModel => {
    const before = previous?.[t.topicId];
    return {
      id: t.topicId,
      name: t.name,
      score: t.score,
      status: t.status,
      workOnNext: next.has(t.topicId),
      blindSpot: blind.has(t.topicId),
      changedFrom: before && before !== t.status ? before : null,
    };
  });

  const edges: TreeEdgeModel[] = [];
  for (const t of topics) {
    for (const parentId of PREREQUISITES[t.topicId] ?? []) {
      const parent = byId.get(parentId);
      if (!parent) continue;
      edges.push({ id: `${parentId}->${t.topicId}`, source: parentId, target: t.topicId, lit: unlocksChildren(parent) });
    }
  }
  return { nodes, edges };
}

export function matchesFilter(node: TreeNodeModel, filter: TreeFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "unlocked":
      return node.status !== "Locked";
    case "weak":
      // Practiced but under Strong: the topics that need reps.
      return node.status === "Weak" || node.status === "Developing";
    case "blind":
      return node.blindSpot;
  }
}

/** Search by topic name or by any platform tag it covers ("dfs" finds Graph traversal). */
export function matchesSearch(node: Pick<TreeNodeModel, "id" | "name">, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (node.name.toLowerCase().includes(q)) return true;
  const topic = TOPIC_BY_ID.get(node.id);
  return !!topic && [...topic.cfTags, ...topic.lcTags].some((tag) => tag.replace(/-/g, " ").includes(q.replace(/-/g, " ")));
}

/** Status snapshot to compare against next time. */
export const statusSnapshot = (topics: readonly TopicStrength[]): Record<string, TopicStatus> =>
  Object.fromEntries(topics.map((t) => [t.topicId, t.status]));

/** Did this topic move up the ladder (an unlock or a promotion), rather than slip? */
export const isPromotion = (from: TopicStatus, to: TopicStatus) => STATUS_ORDER.indexOf(to) > STATUS_ORDER.indexOf(from);

/** Edges on a topic's lineage: every prerequisite path into it and every path out of it. */
export function lineageEdges(id: string, edges: readonly TreeEdgeModel[]): Set<string> {
  const out = new Set<string>();
  const walk = (start: string, dir: "up" | "down") => {
    const stack = [start];
    const seen = new Set<string>();
    while (stack.length) {
      const cur = stack.pop()!;
      if (seen.has(cur)) continue;
      seen.add(cur);
      for (const e of edges) {
        if (dir === "up" ? e.target === cur : e.source === cur) {
          out.add(e.id);
          stack.push(dir === "up" ? e.source : e.target);
        }
      }
    }
  };
  walk(id, "up");
  walk(id, "down");
  return out;
}

/** Best search hit first: name starts with the query, then name contains it, then a tag match. */
export function searchRank(node: Pick<TreeNodeModel, "id" | "name">, query: string): number {
  const q = query.trim().toLowerCase();
  const name = node.name.toLowerCase();
  if (!q) return 0;
  if (name.startsWith(q) || name.split(/\s+/).some((w) => w.startsWith(q))) return 3;
  if (name.includes(q)) return 2;
  return matchesSearch(node, q) ? 1 : 0;
}
