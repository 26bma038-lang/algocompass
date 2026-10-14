import type { CfProblem } from "@/data/types";
import type { TopicStrength } from "./strength";
import { TOPICS, topicsForTags } from "./topics";

/** Problems this far below / above your rating count as "your band". */
export const BAND = { below: 100, above: 400 } as const;

/**
 * How often each topic appears among Codeforces problems in your rating band (0–1 share
 * of band problems). This is what "important for you right now" means for blind spots.
 */
export function bandFrequency(problems: readonly CfProblem[], cfRating: number | null): Map<string, number> {
  const ur = cfRating ?? 800;
  const inBand = problems.filter((p) => p.rating !== null && p.rating >= ur - BAND.below && p.rating <= ur + BAND.above);
  const counts = new Map<string, number>();
  for (const p of inBand) for (const id of topicsForTags(p.tags, "cf")) counts.set(id, (counts.get(id) ?? 0) + 1);
  const total = inBand.length || 1;
  return new Map(TOPICS.map((t) => [t.id, (counts.get(t.id) ?? 0) / total]));
}

export interface StandingItem {
  topicId: string;
  name: string;
  score: number;
  status: TopicStrength["status"];
  /** One plain sentence on why it's listed. */
  reason: string;
}

export interface Standing {
  strengths: StandingItem[];
  weaknesses: StandingItem[];
  blindSpots: StandingItem[];
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** "Where I stand": top 3 strengths, top 3 weaknesses, and blind spots that matter at your rating. */
export function whereIStand(strengths: readonly TopicStrength[], frequency: ReadonlyMap<string, number>): Standing {
  const freq = (id: string) => frequency.get(id) ?? 0;
  const item = (t: TopicStrength, reason: string): StandingItem => ({
    topicId: t.topicId,
    name: t.name,
    score: t.score,
    status: t.status,
    reason,
  });

  const touched = strengths.filter((t) => t.solvedCount > 0);

  const top = [...touched]
    .filter((t) => t.status !== "Weak")
    .sort((a, b) => b.score - a.score || b.solvedCount - a.solvedCount)
    .slice(0, 3)
    .map((t) => item(t, `${t.solvedCount} solved${t.maxCfRatingSolved ? `, up to CF ${t.maxCfRatingSolved}` : ""}`));

  const topIds = new Set(top.map((t) => t.topicId));
  // Weak = practiced but low, ranked by how much it matters at your rating, then by struggle.
  const weak = [...touched]
    .filter((t) => !topIds.has(t.topicId) && (t.status === "Weak" || t.status === "Developing"))
    .sort((a, b) => {
      const need = (t: TopicStrength) => freq(t.topicId) * (100 - t.score) * (1 + (t.struggleRate ?? 0));
      return need(b) - need(a);
    })
    .slice(0, 3)
    .map((t) =>
      item(
        t,
        t.struggleRate !== null && t.struggleRate >= 0.5 && t.cfJudged >= 4
          ? `${pct(t.struggleRate)} of your CF submissions here aren't accepted`
          : `only ${t.solvedCount} solved; in ${pct(freq(t.topicId))} of problems at your rating`,
      ),
    );

  const blind = strengths
    .filter((t) => t.solvedCount === 0 && freq(t.topicId) >= 0.03)
    .sort((a, b) => freq(b.topicId) - freq(a.topicId))
    .slice(0, 3)
    .map((t) => item(t, `never solved, yet in ${pct(freq(t.topicId))} of problems at your rating`));

  return { strengths: top, weaknesses: weak, blindSpots: blind };
}
