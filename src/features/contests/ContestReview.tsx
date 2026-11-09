import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, Check, ExternalLink } from "lucide-react";
import { cfProblemUrl } from "@/adapters/links";
import { CardHeader } from "@/components/CardHeader";
import { ContestName } from "@/components/Term";
import { RowTools } from "@/components/practice/ProblemTools";
import { learnTopicPath } from "@/components/shell/nav";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useContestReviews, useFlagFixNext } from "@/data/contestReview";
import type { ContestReview, ReviewProblem } from "@/engine/contestReview";
import type { ProblemRef } from "@/engine/problemRef";
import { LABELS, plainTopicName } from "@/lib/glossary";
import { openExternal } from "@/lib/openExternal";
import { cn } from "@/lib/utils";

/** Rounds shown before "Show all". */
const SHOWN = 2;

const dateOnly = (t: number) => new Date(t * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

const refOf = (p: ReviewProblem): ProblemRef => ({
  key: p.key,
  title: p.name,
  platform: "cf",
  topics: p.topics,
  difficulty: null,
  rating: p.rating,
  cf: `${p.contestId}-${p.index}`,
  url: cfProblemUrl(p.contestId, p.index),
});

function RatingChange({ r }: { r: ContestReview }) {
  if (r.delta === null) return <span className="text-body-sm text-ink-muted">Unrated</span>;
  const up = r.delta >= 0;
  return (
    <span className="flex flex-col items-end gap-0.5">
      <span className="numeric flex items-center gap-1 font-display text-title font-semibold text-ink">
        {up ? <ArrowUp aria-hidden className="size-4 text-success" strokeWidth={2.4} /> : <ArrowDown aria-hidden className="size-4 text-danger" strokeWidth={2.4} />}
        {up ? "+" : "−"}
        {Math.abs(r.delta)}
        <span className="sr-only">{up ? " rating gained" : " rating lost"}</span>
      </span>
      <span className="numeric text-label text-ink-muted">
        {r.oldRating} → {r.newRating}
      </span>
    </span>
  );
}

/** One tile per problem, in index order: solved in the round, solved since, or not solved. */
function IndexStrip({ problems }: { problems: ReviewProblem[] }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Problems by index">
      {problems.map((p) => {
        const state = p.solved ? "Solved in the round" : p.fixedLater ? "Not solved in the round, solved since" : "Not solved";
        return (
          <li key={p.index}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  tabIndex={0}
                  aria-label={`${p.index}, ${p.name}: ${state}`}
                  className={cn(
                    "numeric relative grid h-9 min-w-9 place-items-center rounded-sm px-2 font-display text-body font-semibold",
                    p.solved ? "border border-glass-border bg-row text-ink" : "border border-dashed border-glass-border-strong text-ink-muted",
                  )}
                >
                  {p.index}
                  {(p.solved || p.fixedLater) && (
                    <span aria-hidden className={cn("absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full", p.solved ? "bg-success text-abyss" : "border border-glass-border-strong bg-abyss-raised text-ink-muted")}>
                      <Check className="size-2.5" strokeWidth={3} />
                    </span>
                  )}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                {p.name}
                {p.rating ? ` · ${p.rating}` : ""} · {state}
              </TooltipContent>
            </Tooltip>
          </li>
        );
      })}
    </ul>
  );
}

function FixNextRow({ p, onOpen }: { p: ReviewProblem; onOpen: (p: ReviewProblem) => void }) {
  return (
    <li className="flex items-center gap-3 border-t border-glass-border py-2.5 first:border-t-0 first:pt-0 last:pb-0">
      <span className="numeric w-7 shrink-0 font-display text-body font-semibold text-ink">{p.index}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body text-ink">{p.name}</span>
        <span className="text-label text-ink-muted">{p.rating ? `Rated ${p.rating}` : LABELS.notRated}</span>
      </span>
      <RowTools problem={refOf(p)} />
      <Button variant="outline" size="sm" onClick={() => onOpen(p)} aria-label={`Open ${p.index}, ${p.name}, on Codeforces (opens in browser)`}>
        Open
        <ExternalLink aria-hidden />
      </Button>
    </li>
  );
}

function ReviewCard({ r }: { r: ContestReview }) {
  const flag = useFlagFixNext();
  const open = (p: ReviewProblem) => {
    const url = cfProblemUrl(p.contestId, p.index);
    if (url) openExternal(url);
    flag.mutate([p.key]);
  };
  const unsolved = r.problems.length - r.solvedCount;
  return (
    <article aria-labelledby={`review-${r.contestId}`} className="glass-card flex h-full flex-col gap-5 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 id={`review-${r.contestId}`} className="line-clamp-2 font-display text-title font-semibold text-ink">
            <ContestName name={r.name.replace(/^Codeforces\s+/i, "")} />
          </h3>
          <span className="numeric text-body-sm text-ink-muted">
            {dateOnly(r.startTime)}
            {r.rank !== null && ` · Rank ${r.rank.toLocaleString()}`}
          </span>
        </div>
        <RatingChange r={r} />
      </header>

      <div className="flex flex-col gap-2">
        <span className="text-label text-ink-muted">
          {r.problems.length > 0 ? `${r.solvedCount} of ${r.problems.length} solved` : `${r.solvedCount} solved`}
        </span>
        {r.problems.length > 0 && <IndexStrip problems={r.problems} />}
      </div>

      {unsolved > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-label text-ink-muted">Topics of the ones you didn't solve</span>
          {r.missedTopics.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {r.missedTopics.slice(0, 6).map((t) => (
                <li key={t.id}>
                  <Link
                    to={learnTopicPath(t.id)}
                    className="inline-flex h-7 items-center gap-1.5 rounded-full border border-glass-border bg-glass px-3 text-body-sm text-ink transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover"
                    aria-label={`${plainTopicName(t.id, t.name)}: ${t.count} unsolved. Watch lessons on it`}
                  >
                    {plainTopicName(t.id, t.name)}
                    {t.count > 1 && <span className="numeric text-ink-muted">×{t.count}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body-sm text-ink-muted">Codeforces hasn't tagged these problems yet.</p>
          )}
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2">
        <span className="text-label text-ink-muted">Fix next</span>
        {r.fixNext.length > 0 ? (
          <>
            <ul className="flex flex-col">
              {r.fixNext.map((p) => (
                <FixNextRow key={p.key} p={p} onOpen={open} />
              ))}
            </ul>
            <p className="text-label text-ink-muted">Once you solve one, it comes back for review after 3 days.</p>
          </>
        ) : (
          <p className="text-body-sm text-ink-muted">{unsolved === 0 ? "You solved every problem in this round." : "You've solved the next ones since. Nice."}</p>
        )}
      </div>
    </article>
  );
}

/** Contests → Contest review: one card per Codeforces round you took part in, newest first. */
export function ContestReviewSection() {
  const { data } = useContestReviews();
  const [all, setAll] = useState(false);
  if (!data || data.length === 0) return null;
  const shown = all ? data : data.slice(0, SHOWN);
  return (
    <section aria-labelledby="review-title" className="flex flex-col gap-4">
      <CardHeader
        id="review-title"
        title="Contest review"
        description="Each Codeforces round you took part in: what you solved, what to fix next."
        pill={`${data.length} ${data.length === 1 ? "round" : "rounds"}`}
      />
      <div className="grid grid-cols-12 gap-6">
        {shown.map((r) => (
          <div key={r.id} className="col-span-12 xl:col-span-6">
            <ReviewCard r={r} />
          </div>
        ))}
      </div>
      {data.length > SHOWN && (
        <Button variant="ghost" className="self-start" onClick={() => setAll((v) => !v)} aria-expanded={all}>
          {all ? "Show fewer" : `Show all ${data.length} rounds`}
        </Button>
      )}
    </section>
  );
}
