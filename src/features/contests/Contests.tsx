import { useId } from "react";
import { ArrowDown, ArrowUp, ExternalLink, Swords } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatDuration, useContestsData, useSetAttending, type PastContest } from "@/data/contests";
import type { Contest } from "@/data/types";
import { contestDivision, registerUrl } from "@/engine/contests";
import { countdown, shortName, when } from "@/features/home/ContestStrip";
import { useNow } from "@/features/home/useNow";
import { openExternal } from "@/lib/openExternal";
import { cn } from "@/lib/utils";

const PLATFORM = { cf: "Codeforces", lc: "LeetCode" } as const;
const dot = (p: Contest["platform"]) => (p === "cf" ? "bg-platform-cf" : "bg-platform-lc");

function AttendToggle({ c, attending }: { c: Contest; attending: boolean }) {
  const id = useId();
  const set = useSetAttending();
  return (
    <span className="flex items-center gap-2">
      <Switch
        id={id}
        checked={attending}
        disabled={set.isPending}
        onCheckedChange={(v) => set.mutate({ contestId: c.id, attending: v, name: c.name })}
      />
      <label htmlFor={id} className={cn("cursor-pointer text-body-sm whitespace-nowrap", attending ? "text-ink" : "text-ink-muted")}>
        I'll attend
      </label>
    </span>
  );
}

function Meta({ c }: { c: Contest }) {
  const div = contestDivision(c);
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-ink-muted">
      <span className="numeric text-ink">{when(c.startTime)}</span>
      <span aria-hidden>·</span>
      <span className="numeric">{formatDuration(c.durationSeconds)}</span>
      {div && (
        <span className="ml-1 inline-flex h-6 items-center rounded-full border border-glass-border bg-glass px-2.5 text-label text-ink-muted">{div}</span>
      )}
    </span>
  );
}

/** The next Codeforces round: the main event, so it leads in display size. */
function NextRound({ c, attending, nowMs }: { c: Contest; attending: boolean; nowMs: number }) {
  const live = c.startTime <= nowMs / 1000;
  return (
    <section aria-labelledby="next-round" className="glass-card flex flex-wrap items-end justify-between gap-6 p-6">
      <div className="flex min-w-0 flex-col gap-2">
        <span className="flex items-center gap-1.5 text-label text-ink-muted">
          <span aria-hidden className="size-1.5 rounded-full bg-platform-cf" />
          Next Codeforces round
        </span>
        <h2 id="next-round" className="font-display text-headline font-semibold text-ink">
          {shortName(c)}
        </h2>
        <Meta c={c} />
      </div>
      <div className="flex flex-col items-start gap-3 sm:items-end">
        <span className="numeric font-display text-display leading-none font-semibold text-ink">{countdown(c.startTime, nowMs)}</span>
        <div className="flex items-center gap-4">
          <AttendToggle c={c} attending={attending} />
          <Button onClick={() => openExternal(live ? c.url : registerUrl(c))}>
            {live ? "Open contest" : "Register"}
            <ExternalLink aria-hidden />
            <span className="sr-only"> (opens in browser)</span>
          </Button>
        </div>
      </div>
    </section>
  );
}

function ContestRow({ c, attending, nowMs }: { c: Contest; attending: boolean; nowMs: number }) {
  const live = c.startTime <= nowMs / 1000;
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-glass-border py-3 first:border-t-0 first:pt-0 last:pb-0">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2 text-body text-ink">
          <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", dot(c.platform))} />
          <span className="truncate">{shortName(c)}</span>
        </span>
        <Meta c={c} />
      </span>
      <span className="numeric w-[92px] text-right font-display text-title font-semibold text-ink">{countdown(c.startTime, nowMs)}</span>
      <AttendToggle c={c} attending={attending} />
      <Button variant="outline" size="sm" onClick={() => openExternal(live ? c.url : registerUrl(c))} aria-label={`${live ? "Open" : "Register for"} ${c.name} on ${PLATFORM[c.platform]} (opens in browser)`}>
        {live ? "Open" : "Register"}
      </Button>
    </li>
  );
}

function UpcomingList({ title, contests, attending, nowMs, note }: { title: string; contests: Contest[]; attending: ReadonlySet<string>; nowMs: number; note?: string }) {
  return (
    <section aria-label={title} className="glass-card flex flex-col gap-3 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-title font-semibold text-ink">{title}</h2>
        {note && <span className="text-label text-ink-muted">{note}</span>}
      </div>
      {contests.length === 0 ? (
        <p className="text-body-sm text-ink-muted">Nothing else is scheduled yet. New rounds appear after the next sync.</p>
      ) : (
        <ul className="flex flex-col">
          {contests.map((c) => (
            <ContestRow key={c.id} c={c} attending={attending.has(c.id)} nowMs={nowMs} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Delta({ d }: { d: number | null }) {
  if (d === null) return <span className="text-body-sm text-ink-faint">Unrated</span>;
  const up = d >= 0;
  return (
    <span className="numeric flex items-center justify-end gap-1 font-display text-body font-semibold text-ink">
      {up ? <ArrowUp aria-hidden className="size-3.5 text-success" strokeWidth={2.4} /> : <ArrowDown aria-hidden className="size-3.5 text-danger" strokeWidth={2.4} />}
      {up ? "+" : "−"}
      {Math.abs(d)}
      <span className="sr-only">{up ? " rating gained" : " rating lost"}</span>
    </span>
  );
}

const dateOnly = (t: number) => new Date(t * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

function PastList({ past }: { past: PastContest[] }) {
  return (
    <section aria-labelledby="past-title" className="glass-card flex flex-col gap-3 p-5">
      <h2 id="past-title" className="text-title font-semibold text-ink">
        Past contests
      </h2>
      {past.length === 0 ? (
        <p className="text-body-sm text-ink-muted">No contests yet. Rounds you take part in show here with your rank, rating change and solves.</p>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="text-label text-ink-muted">
              <th className="pb-2 font-medium">Contest</th>
              <th className="pb-2 text-right font-medium">Solved</th>
              <th className="pb-2 text-right font-medium">Rank</th>
              <th className="pb-2 text-right font-medium">Rating</th>
            </tr>
          </thead>
          <tbody>
            {past.map((p) => (
              <tr key={p.id} className="border-t border-glass-border">
                <td className="py-2.5 pr-4">
                  <span className="flex items-center gap-2 text-body-sm text-ink">
                    <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", dot(p.platform))} />
                    <span className="line-clamp-1">{p.platform === "cf" ? p.name.replace(/^Codeforces\s+/i, "") : p.name}</span>
                    <span className="sr-only">, {PLATFORM[p.platform]}</span>
                  </span>
                  <span className="pl-3.5 text-label text-ink-muted">{dateOnly(p.startTime)}</span>
                </td>
                <td className="numeric py-2.5 text-right text-body-sm text-ink">
                  {p.solved !== null && p.total !== null ? (
                    <>
                      {p.solved}
                      <span className="text-ink-muted"> of {p.total}</span>
                    </>
                  ) : (
                    <span className="text-ink-faint">–</span>
                  )}
                </td>
                <td className="numeric py-2.5 text-right text-body-sm text-ink">{p.rank !== null ? p.rank.toLocaleString() : <span className="text-ink-faint">–</span>}</td>
                <td className="py-2.5 pl-4 text-right">
                  <Delta d={p.delta} />
                  {p.newRating !== null && <span className="numeric block text-label text-ink-muted">{p.newRating}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="text-label text-ink-muted">
        After a Codeforces round you took part in, the problems just past what you solved go to Upsolve in Practice.
      </p>
    </section>
  );
}

/** Contests: Codeforces first and biggest, LeetCode below it, then your history. */
export function Contests() {
  const { data, isLoading } = useContestsData();
  const nowMs = useNow(15_000);
  if (isLoading) return <p className="text-body-sm text-ink-muted">Loading contests…</p>;
  if (!data || (data.upcoming.length === 0 && data.past.length === 0)) {
    return (
      <EmptyState icon={Swords} title="No contests loaded">
        Upcoming Codeforces rounds are listed here first, with LeetCode weekly and biweekly contests below them. They appear after the first sync.
      </EmptyState>
    );
  }
  const cf = data.upcoming.filter((c) => c.platform === "cf");
  const lc = data.upcoming.filter((c) => c.platform === "lc");
  const [next, ...laterCf] = cf;
  return (
    <div className="flex flex-col gap-4">
      {next && <NextRound c={next} attending={data.attending.has(next.id)} nowMs={nowMs} />}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 flex flex-col gap-4 xl:col-span-7">
          <UpcomingList title="More Codeforces rounds" contests={laterCf} attending={data.attending} nowMs={nowMs} note="Reminders 1 hour and 10 minutes before rounds you'll attend" />
          <UpcomingList title="LeetCode" contests={lc} attending={data.attending} nowMs={nowMs} />
        </div>
        <div className="col-span-12 xl:col-span-5">
          <PastList past={data.past} />
        </div>
      </div>
    </div>
  );
}
