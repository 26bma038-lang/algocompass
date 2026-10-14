/** Public web pages for problems. Platform URL shapes live here with the rest of the platform knowledge. */

/** Codeforces problem page. Contest ids ≥ 100000 are gym contests. */
export function cfProblemUrl(contestId: number | null, index: string): string | null {
  if (contestId === null) return null;
  const section = contestId >= 100_000 ? "gym" : "contest";
  return `https://codeforces.com/${section}/${contestId}/problem/${encodeURIComponent(index)}`;
}

export function lcProblemUrl(slug: string): string {
  return `https://leetcode.com/problems/${encodeURIComponent(slug)}/`;
}
