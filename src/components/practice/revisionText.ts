import { cfProblemUrl, lcProblemUrl } from "@/adapters/links";
import type { DueRevision } from "@/engine/revision";

/** Where a due problem opens ("cf:1850-A" → its Codeforces page); null for ids with no page. Kept apart from ReviewCard so Today stays light. */
export function revisionUrl(d: Pick<DueRevision, "platform" | "problemId">): string | null {
  if (d.platform === "lc") return lcProblemUrl(d.problemId);
  const m = /^(\d+)-(.+)$/.exec(d.problemId);
  return m ? cfProblemUrl(Number(m[1]), m[2]!) : null;
}

/** "Due today" / "Due 3 days ago" for the row's second line. */
export const dueWords = (d: Pick<DueRevision, "overdueDays">) => (d.overdueDays === 0 ? "Due today" : d.overdueDays === 1 ? "Due yesterday" : `Due ${d.overdueDays} days ago`);
