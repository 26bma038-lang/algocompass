import type { Repo } from "@/data/repo";
import type { CfUser, LcProfile } from "@/data/types";
import { bandFrequency, whereIStand, type Standing } from "./standing";
import { computeTopicStrengths, type TopicStrength } from "./strength";

export interface TopicReport {
  computedAt: number;
  cfRating: number | null;
  topics: TopicStrength[];
  standing: Standing;
}

/** Loads everything the engine needs from the local cache and runs it. The engine itself stays pure. */
export async function buildTopicReport(repo: Repo, now = Math.floor(Date.now() / 1000)): Promise<TopicReport> {
  const [cfProfile, lcProfile, cfSubmissions, lcTagCounts, lcProblems, lcRecentAc, problems] = await Promise.all([
    repo.getProfile<CfUser>("cf"),
    repo.getProfile<LcProfile>("lc"),
    repo.getCfSubmissions(),
    repo.getLcTagCounts(),
    repo.getLcProblems(),
    repo.getLcRecentAc(),
    repo.getCfProblems(),
  ]);
  const cfRating = cfProfile?.data.rating ?? null;
  const topics = computeTopicStrengths({
    now,
    cfRating,
    cfSubmissions,
    lcSolved: lcProfile?.data.solved ?? null,
    lcTagCounts,
    lcProblems,
    lcRecentAc,
  });
  return { computedAt: now, cfRating, topics, standing: whereIStand(topics, bandFrequency(problems, cfRating)) };
}
