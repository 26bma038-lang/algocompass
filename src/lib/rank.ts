/**
 * Codeforces rank → Rank Aura color token (DESIGN.md "The Earned Light Rule").
 * The accent is always the user's real current rank; expert is only the pre-sync fallback.
 */
export type CfRank =
  | "newbie"
  | "pupil"
  | "specialist"
  | "expert"
  | "candidate master"
  | "master"
  | "international master"
  | "grandmaster"
  | "international grandmaster"
  | "legendary grandmaster";

export type RankToken =
  | "rank-newbie"
  | "rank-pupil"
  | "rank-specialist"
  | "rank-expert"
  | "rank-candidate-master"
  | "rank-master"
  | "rank-grandmaster";

export interface RankBand {
  rank: CfRank;
  label: string;
  token: RankToken;
  /** Inclusive lower rating bound. */
  min: number;
}

/** Codeforces rating bands, ascending. */
export const RANK_BANDS: readonly RankBand[] = [
  { rank: "newbie", label: "Newbie", token: "rank-newbie", min: -Infinity },
  { rank: "pupil", label: "Pupil", token: "rank-pupil", min: 1200 },
  { rank: "specialist", label: "Specialist", token: "rank-specialist", min: 1400 },
  { rank: "expert", label: "Expert", token: "rank-expert", min: 1600 },
  { rank: "candidate master", label: "Candidate Master", token: "rank-candidate-master", min: 1900 },
  { rank: "master", label: "Master", token: "rank-master", min: 2100 },
  { rank: "international master", label: "International Master", token: "rank-master", min: 2300 },
  { rank: "grandmaster", label: "Grandmaster", token: "rank-grandmaster", min: 2400 },
  { rank: "international grandmaster", label: "International Grandmaster", token: "rank-grandmaster", min: 2600 },
  { rank: "legendary grandmaster", label: "Legendary Grandmaster", token: "rank-grandmaster", min: 3000 },
];

export const FALLBACK_RANK_TOKEN: RankToken = "rank-expert";

export function bandForRating(rating: number): { current: RankBand; next: RankBand | null } {
  let index = 0;
  for (let i = 0; i < RANK_BANDS.length; i++) {
    if (rating >= RANK_BANDS[i]!.min) index = i;
  }
  return { current: RANK_BANDS[index]!, next: RANK_BANDS[index + 1] ?? null };
}

/** Progress (0–1) through the current band toward the next rank. */
export function bandProgress(rating: number): number {
  const { current, next } = bandForRating(rating);
  if (!next) return 1;
  const floor = Number.isFinite(current.min) ? current.min : next.min - 400;
  return Math.min(1, Math.max(0, (rating - floor) / (next.min - floor)));
}

/** Points the rank colour (--rank) at a rank: the rating number, rank chip and rank progress. */
export function applyRankAccent(current: RankToken, next: RankToken | null) {
  const root = document.documentElement.style;
  // Since the redesign the rank colour paints only rank elements; the theme owns the chrome.
  root.setProperty("--rank", `var(--${current})`);
  root.setProperty("--rank-next", `var(--${next ?? current})`);
}
