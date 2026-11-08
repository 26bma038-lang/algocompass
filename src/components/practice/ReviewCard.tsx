import { ExternalLink } from "lucide-react";
import { cfProblemUrl, lcProblemUrl } from "@/adapters/links";
import { CardHeader } from "@/components/CardHeader";
import { Button } from "@/components/ui/button";
import { useReviewRevision, useDueRevisions } from "@/data/revisions";
import { solvedAgoWords, type DueRevision } from "@/engine/revision";
import { LABELS } from "@/lib/glossary";
import { openExternal } from "@/lib/openExternal";

/** Where a due problem opens ("cf:1850-A" → its Codeforces page); null for ids with no page. */
export function revisionUrl(d: Pick<DueRevision, "platform" | "problemId">): string | null {
  if (d.platform === "lc") return lcProblemUrl(d.problemId);
  const m = /^(\d+)-(.+)$/.exec(d.problemId);
  return m ? cfProblemUrl(Number(m[1]), m[2]!) : null;
}

/** "Due today" / "Due 3 days ago" for the row's second line. */
export const dueWords = (d: Pick<DueRevision, "overdueDays">) => (d.overdueDays === 0 ? "Due today" : d.overdueDays === 1 ? "Due yesterday" : `Due ${d.overdueDays} days ago`);

export function RevisionRow({ d, primary = false }: { d: DueRevision; primary?: boolean }) {
  const review = useReviewRevision();
  const href = revisionUrl(d);
  const site = d.platform === "cf" ? "Codeforces" : "LeetCode";
  const now = Math.floor(Date.now() / 1000);
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-sm px-3 py-2.5 transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover">
      <span className="flex min-w-0 flex-1 basis-60 flex-col">
        <span className="truncate text-body text-ink">{d.title}</span>
        <span className="truncate text-label text-ink-muted">
          {solvedAgoWords(d.at, now)}, {site}. {dueWords(d)}
          {d.stage === 1 ? ", the 30-day review" : ""}
        </span>
      </span>
      {href && (
        <Button variant={primary ? "primary" : "outline"} size="sm" onClick={() => openExternal(href)} aria-label={`Open ${d.title} on ${site}`}>
          Open on {site}
          <ExternalLink aria-hidden />
        </Button>
      )}
      <Button variant="ghost" size="sm" disabled={review.isPending} onClick={() => review.mutate({ due: d, stillHard: false })} aria-label={`${LABELS.solvedAgain}: ${d.title}`}>
        {LABELS.solvedAgain}
      </Button>
      <Button variant="ghost" size="sm" disabled={review.isPending} onClick={() => review.mutate({ due: d, stillHard: true })} aria-label={`${LABELS.stillHard}: ${d.title}, ask again in 3 days`}>
        {LABELS.stillHard}
      </Button>
    </li>
  );
}

/** Practice → Today's problems: solved problems that came back (7 and 30 days later). Nothing when none are due. */
export function ReviewCard() {
  const due = useDueRevisions().data ?? [];
  if (due.length === 0) return null;
  return (
    <section aria-labelledby="review-title" className="glass-card flex flex-col gap-4 p-6">
      <CardHeader
        id="review-title"
        title={LABELS.dueForReview}
        description="Problems you solved a while ago. Doing one again is how it sticks."
        pill={`${due.length} due`}
      />
      <ul className="-mx-3 flex flex-col">
        {due.map((d, i) => (
          <RevisionRow key={d.key} d={d} primary={i === 0} />
        ))}
      </ul>
    </section>
  );
}
