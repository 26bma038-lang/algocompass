import { useEffect, useRef, useState } from "react";
import { Check, ExternalLink, RefreshCw, Timer } from "lucide-react";
import { cfProblemUrl } from "@/adapters/links";
import { CardHeader } from "@/components/CardHeader";
import { ContestName } from "@/components/Term";
import { RowTools } from "@/components/practice/ProblemTools";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/data/contests";
import { useCheckVirtualSolves, useDeleteVirtual, useEndVirtual, useStartVirtual, useVirtualCandidates, useVirtuals, type VirtualView } from "@/data/virtual";
import type { ProblemRef } from "@/engine/problemRef";
import { topicsForTags } from "@/engine/topics";
import { clock, DIVISIONS, isRunning, minutesWords, virtualEndsAt, type Division, type VirtualCandidate, type VirtualProblemResult, type VirtualRow } from "@/engine/virtual";
import { useNow } from "@/features/home/useNow";
import { LABELS } from "@/lib/glossary";
import { openExternal } from "@/lib/openExternal";
import { cn } from "@/lib/utils";
import { TopicChips } from "./ContestReview";

/** While a virtual runs, your latest Codeforces submissions are pulled this often. */
const CHECK_EVERY_MS = 2 * 60 * 1000;
const CANDIDATES_SHOWN = 5;

const dateOnly = (t: number) => new Date(t * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const shortName = (name: string) => name.replace(/^Codeforces\s+/i, "");

const refOf = (row: VirtualRow, p: VirtualProblemResult): ProblemRef => ({
  key: `cf:${row.contestId}-${p.index}`,
  title: p.name,
  platform: "cf",
  topics: topicsForTags(p.tags, "cf"),
  difficulty: null,
  rating: p.rating,
  cf: `${row.contestId}-${p.index}`,
  url: cfProblemUrl(row.contestId, p.index),
});

function openProblem(row: VirtualRow, index: string) {
  const url = cfProblemUrl(row.contestId, index);
  if (url) openExternal(url);
}

/** The clock and the round's problems while a virtual runs. */
function RunningCard({ v }: { v: VirtualView }) {
  const nowMs = useNow(1000);
  const now = Math.floor(nowMs / 1000);
  const check = useCheckVirtualSolves();
  const end = useEndVirtual();
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const { row, result } = v;
  const left = virtualEndsAt(row) - now;
  const elapsedShare = Math.min(1, Math.max(0, (now - row.startedAt) / row.durationSeconds));

  const runCheck = useRef(() => {});
  runCheck.current = () => check.mutate(undefined, { onSuccess: (ok) => ok && setCheckedAt(Math.floor(Date.now() / 1000)) });
  useEffect(() => {
    const t = window.setInterval(() => runCheck.current(), CHECK_EVERY_MS);
    return () => window.clearInterval(t);
  }, []);
  // When the clock runs out, one last look for solves (submissions keep their real time, so late updates still count).
  const wasRunning = useRef(true);
  useEffect(() => {
    if (left <= 0 && wasRunning.current) {
      wasRunning.current = false;
      runCheck.current();
    }
  }, [left]);

  return (
    <section aria-labelledby="virtual-running" className="glass-card flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="flex items-center gap-1.5 text-label text-ink-muted">
            <Timer aria-hidden className="size-3.5" />
            Virtual contest, on your own
          </span>
          <h2 id="virtual-running" className="font-display text-headline font-semibold text-ink">
            <ContestName name={shortName(row.name)} />
          </h2>
          <span className="text-body-sm text-ink-muted">
            {result.solved} of {row.problems.length} solved · {formatDuration(row.durationSeconds)}, its real length
          </span>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <span className="numeric font-display text-display leading-none font-semibold text-accent" role="timer" aria-label={`${clock(left)} left`}>
            {clock(left)}
          </span>
          <span className="text-label text-ink-muted">left</span>
        </div>
      </div>
      <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-glass">
        <div className="h-full rounded-full bg-accent" style={{ width: `${elapsedShare * 100}%` }} />
      </div>

      <ul className="flex flex-col">
        {result.problems.map((p) => (
          <li key={p.index} className="flex items-center gap-3 border-t border-glass-border py-2.5 first:border-t-0 first:pt-0 last:pb-0">
            <span className="numeric w-7 shrink-0 font-display text-body font-semibold text-ink">{p.index}</span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-body text-ink">{p.name}</span>
              <span className="text-label text-ink-muted">
                {p.solvedAt !== null ? (
                  <span className="inline-flex items-center gap-1 text-ink">
                    <Check aria-hidden className="size-3.5 text-success" strokeWidth={2.6} />
                    Solved at {clock(p.elapsed ?? 0)}
                  </span>
                ) : p.wrongTries > 0 ? (
                  `${p.wrongTries} wrong ${p.wrongTries === 1 ? "try" : "tries"} so far`
                ) : p.rating ? (
                  `Rated ${p.rating}`
                ) : (
                  LABELS.notRated
                )}
              </span>
            </span>
            <Button variant={p.solvedAt !== null ? "ghost" : "outline"} size="sm" onClick={() => openProblem(row, p.index)} aria-label={`Open ${p.index}, ${p.name}, on Codeforces (opens in browser)`}>
              Open
              <ExternalLink aria-hidden />
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-glass-border pt-4">
        <p className="max-w-[52ch] text-body-sm text-ink-muted">
          Submit on Codeforces. Your solves show up here within 2 minutes{checkedAt ? `; last checked at ${new Date(checkedAt * 1000).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}` : ""}.
          {check.data === false && " Couldn't reach Codeforces just now; it will try again."}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" disabled={check.isPending} onClick={() => runCheck.current()}>
            <RefreshCw aria-hidden className={cn(check.isPending && "animate-spin")} />
            Check for solves
          </Button>
          {confirmEnd ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setConfirmEnd(false)}>
                Keep going
              </Button>
              <Button size="sm" disabled={end.isPending} onClick={() => end.mutate(row.id)}>
                End it now
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setConfirmEnd(true)}>
              I'm done
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

/** What you did in a finished virtual: solved, time per problem, topics missed. No standings. */
function ReviewCard({ v, latest }: { v: VirtualView; latest: boolean }) {
  const del = useDeleteVirtual();
  const { row, result } = v;
  const used = virtualEndsAt(row) - row.startedAt;
  const unsolved = result.problems.filter((p) => p.solvedAt === null);
  return (
    <article aria-labelledby={`virtual-${row.id}`} className={cn("flex flex-col gap-4", latest ? "" : "border-t border-glass-border pt-5")}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 id={`virtual-${row.id}`} className="font-display text-title font-semibold text-ink">
            <ContestName name={shortName(row.name)} />
          </h3>
          <span className="text-body-sm text-ink-muted">
            Virtual on {dateOnly(row.startedAt)} · {result.solved} of {row.problems.length} solved in {minutesWords(used)}
            {row.endedAt !== null && row.endedAt < row.startedAt + row.durationSeconds ? " (ended early)" : ""}
          </span>
        </div>
        <Button variant="ghost" size="sm" disabled={del.isPending} onClick={() => del.mutate(row.id)} aria-label={`Remove the virtual of ${row.name} from this list`}>
          Remove
        </Button>
      </header>
      {latest && (
        <>
          <table className="w-full text-left">
            <thead>
              <tr className="text-label text-ink-muted">
                <th className="pb-2 font-medium">Problem</th>
                <th className="pb-2 pl-3 text-right font-medium">Solved at</th>
                <th className="pb-2 pl-3 text-right font-medium">Took</th>
                <th className="pb-2 pl-3 text-right font-medium">Wrong tries</th>
                <th className="pb-2 pl-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {result.problems.map((p) => (
                <tr key={p.index} className="border-t border-glass-border">
                  <td className="py-2 pr-3">
                    <span className="flex items-center gap-2 text-body-sm text-ink">
                      <span className="numeric w-6 font-display font-semibold">{p.index}</span>
                      <span className="line-clamp-1">{p.name}</span>
                      {p.rating && <span className="numeric text-label text-ink-muted">{p.rating}</span>}
                    </span>
                  </td>
                  <td className="numeric py-2 pl-3 text-right text-body-sm whitespace-nowrap text-ink">{p.elapsed !== null ? clock(p.elapsed) : <span className="text-ink-muted">Not solved</span>}</td>
                  <td className="numeric py-2 pl-3 text-right text-body-sm whitespace-nowrap text-ink">{p.took !== null ? minutesWords(p.took) : <span className="text-ink-faint">–</span>}</td>
                  <td className="numeric py-2 pl-3 text-right text-body-sm text-ink">{p.wrongTries}</td>
                  <td className="py-2 pl-3">
                    <span className="flex items-center justify-end gap-1">
                      {p.solvedAt === null && (
                        <>
                          <RowTools problem={refOf(row, p)} />
                          <Button variant="outline" size="sm" onClick={() => openProblem(row, p.index)} aria-label={`Open ${p.index}, ${p.name}, on Codeforces (opens in browser)`}>
                            Open
                          </Button>
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {unsolved.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-label text-ink-muted">Topics you missed</span>
              <TopicChips topics={result.missedTopics} />
            </div>
          )}
        </>
      )}
    </article>
  );
}

function DivisionPicker({ value, onChange }: { value: Division; onChange: (d: Division) => void }) {
  return (
    <div role="radiogroup" aria-label="Division" className="flex h-10 items-center gap-1 self-start rounded-md border border-glass-border bg-glass p-1">
      {DIVISIONS.map((d) => (
        <button
          key={d.id}
          type="button"
          role="radio"
          aria-checked={value === d.id}
          onClick={() => onChange(d.id)}
          className={cn(
            "flex h-8 items-center rounded-sm px-4 text-body-sm font-medium transition-colors duration-[var(--dur-fast)]",
            value === d.id ? "bg-accent-soft text-ink" : "text-ink-muted hover:bg-glass-hover hover:text-ink",
          )}
        >
          {d.label}
        </button>
      ))}
    </div>
  );
}

function CandidateRow({ c, onStart, starting }: { c: VirtualCandidate; onStart: () => void; starting: boolean }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-glass-border py-3 first:border-t-0 first:pt-0 last:pb-0">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-body text-ink">
          <ContestName name={shortName(c.name)} />
        </span>
        <span className="numeric text-body-sm text-ink-muted">
          {dateOnly(c.startTime)} · {c.problems.length} problems · {formatDuration(c.durationSeconds)}
        </span>
      </span>
      {confirm ? (
        <span className="flex items-center gap-2">
          <span className="text-body-sm text-ink-muted">Starts a {formatDuration(c.durationSeconds)} clock now.</span>
          <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>
            Cancel
          </Button>
          <Button size="sm" disabled={starting} onClick={onStart}>
            Start the clock
          </Button>
        </span>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setConfirm(true)} aria-label={`Start ${c.name} as a virtual contest`}>
          Start
        </Button>
      )}
    </li>
  );
}

function Picker() {
  const [division, setDivision] = useState<Division>("div3");
  const [more, setMore] = useState(false);
  const candidates = useVirtualCandidates(division);
  const start = useStartVirtual();
  const list = candidates.data ?? [];
  const shown = more ? list.slice(0, 30) : list.slice(0, CANDIDATES_SHOWN);
  return (
    <div className="flex flex-col gap-4">
      <DivisionPicker
        value={division}
        onChange={(d) => {
          setDivision(d);
          setMore(false);
        }}
      />
      {candidates.isLoading || !candidates.data ? (
        <p className="text-body-sm text-ink-muted">Loading past rounds…</p>
      ) : list.length === 0 ? (
        <p className="text-body-sm text-ink-muted">No past {DIVISIONS.find((d) => d.id === division)?.label} round you haven't tried is known yet. Rounds load with the next update.</p>
      ) : (
        <>
          <ul className="flex flex-col">
            {shown.map((c) => (
              <CandidateRow key={c.contestId} c={c} starting={start.isPending} onStart={() => start.mutate(c)} />
            ))}
          </ul>
          {list.length > CANDIDATES_SHOWN && (
            <Button variant="ghost" size="sm" className="self-start" aria-expanded={more} onClick={() => setMore((m) => !m)}>
              {more ? "Show fewer" : `Show more (${list.length} rounds)`}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Contests → Virtual contest. Mounted twice: at the top ("top", only while one runs, so the clock
 * leads the screen) and in the column ("column": the picker and your past virtuals, when none runs).
 */
export function VirtualSection({ where }: { where: "top" | "column" }) {
  const { data } = useVirtuals();
  const nowMs = useNow(15_000);
  const now = Math.floor(nowMs / 1000);
  const running = data?.find((v) => isRunning(v.row, now));
  if (where === "top") return running ? <RunningCard v={running} /> : null;
  if (running || !data) return null;
  const past = data ?? [];
  return (
    <section aria-labelledby="virtual-title" className="glass-card flex flex-col gap-5 p-6">
      <CardHeader
        id="virtual-title"
        title="Virtual contest"
        description="A past Codeforces round you haven't tried, timed at its real length. Just you and the clock: no standings."
        pill={past.length > 0 ? `${past.length} done` : undefined}
      />
      <Picker />
      {past.length > 0 && (
        <div className="flex flex-col gap-5 border-t border-glass-border pt-5">
          <span className="text-label text-ink-muted">
            Your virtual contests
          </span>
          {past.slice(0, 4).map((v, i) => (
            <ReviewCard key={v.row.id} v={v} latest={i === 0} />
          ))}
        </div>
      )}
    </section>
  );
}
