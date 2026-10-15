import resourcesData from "./resources.json";
import lcListsData from "./lc_lists.json";
import type { CuratedLcProblem } from "@/engine/recommender";
import type { LcDifficulty } from "./types";

/** Hand-curated study material, bundled with the app. Links are verified by `npm run check:links`. */

export type ResourceKind = "article" | "video" | "problems";

export interface Resource {
  kind: ResourceKind;
  title: string;
  source: string;
  url: string;
}

export interface TopicResources {
  learn: Resource[];
  practice: Resource[];
  deeper: Resource[];
}

export const RESOURCES = resourcesData.topics as Record<string, TopicResources>;

export interface LcList {
  name: string;
  url: string | null;
}

export const LC_LISTS = lcListsData.lists as Record<string, LcList>;

export const LC_CURATED: readonly CuratedLcProblem[] = lcListsData.problems.map((p) => ({
  ...p,
  difficulty: p.difficulty as LcDifficulty,
}));
