import { useId, type ReactNode } from "react";
import { Link, Outlet } from "react-router-dom";
import { ArrowDown, ArrowUp, ExternalLink, RefreshCw, Swords } from "lucide-react";
import { CardHeader } from "@/components/CardHeader";
import { EmptyState } from "@/components/EmptyState";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { ContestName } from "@/components/Term";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatDuration, useContestsData, useSetAttending, type PastContest } from "@/data/contests";
import type { Contest } from "@/data/types";
import { contestDivision, registerUrl } from "@/engine/contests";
import { countdown, shortName, when } from "@/features/home/ContestStrip";
import { useNow } from "@/features/home/useNow";
import { useHandles } from "@/data/settings";
import { useSyncStore } from "@/data/syncStore";
import { LABELS } from "@/lib/glossary";
import { openExternal } from "@/lib/openExternal";
import { cn } from "@/lib/utils";
import { ContestReviewSection } from "./ContestReview";
import { VirtualSection } from "./Virtual";
import { CONTESTS_TABS } from "./tabs";

const PLATFORM = { cf: "Codeforces", lc: "LeetCode" } as const;

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
          <span aria-hidden className="size-1.5 rounded-full bg-ink-faint" />
          Next Codeforces round
        </span>
        <h2 id="next-round" className="font-display text-headline font-semibold text-ink">
          <ContestName name={shortName(c)} />
        </h2>
        <Meta c={c} />
      </div>
      <div className="flex flex-col items-start gap-3 sm:items-end">
        <span className="numeric font-display text-display leading-none font-semibold text-accent">{countdown(c.startTime, nowMs)}</span>
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
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-ink-faint" />
          <span className="truncate">
            <ContestName name={shortName(c)} />
          </span>
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
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="glass-card flex flex-col gap-4 p-6">
      <CardHeader id={headingId} title={title} description={note} pill={contests.length > 0 ? `${contests.length} upcoming` : undefined} />
      {contests.length === 0 ? (
        <p className="text-body-sm text-ink-muted">Nothing else is scheduled yet. New rounds appear after the next update.</p>
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
    <section aria-labelledby="past-title" className="glass-card flex flex-col gap-4 p-6">
      <CardHeader id="past-title" title="Past contests" pill={past.length > 0 ? `${past.length} ${past.length === 1 ? "round" : "rounds"}` : undefined} />
      {past.length === 0 ? (
        <p className="text-body-sm text-ink-muted">No contests yet. Rounds you take part in show here with your rank, rating change and solves.</p>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="text-label text-ink-muted">
              <th className="pb-2 font-medium">Contest</th>
              <th className="pb-2 pl-3 text-right font-medium">Solved</th>
              <th className="pb-2 pl-4 text-right font-medium">Rank</th>
              <th className="pb-2 pl-4 text-right font-medium">Rating</th>
            </tr>
          </thead>
          <tbody>
            {past.map((p) => (
              <tr key={p.id} className="border-t border-glass-border">
                <td className="py-2.5 pr-4">
                  <span className="flex items-center gap-2 text-body-sm text-ink">
                    <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-ink-faint" />
                    <span className="line-clamp-1">{p.platform === "cf" ? p.name.replace(/^Codeforces\s+/i, "") : p.name}</span>
                    <span className="sr-only">, {PLATFORM[p.platform]}</span>
                  </span>
                  <span className="pl-3.5 text-label text-ink-muted">{dateOnly(p.startTime)}</span>
                </td>
                <td className="numeric py-2.5 pl-3 text-right text-body-sm whitespace-nowrap text-ink">
                  {p.solved !== null ? (
                    <>
                      {p.solved}
                      <span className="text-ink-muted">{p.total !== null ? ` of ${p.total}` : " solved"}</span>
                    </>
                  ) : (
                    <span className="text-ink-faint">–</span>
                  )}
                </td>
                <td className="numeric py-2.5 pl-4 text-right text-body-sm whitespace-nowrap text-ink">{p.rank !== null ? p.rank.toLocaleString() : <span className="text-ink-faint">–</span>}</td>
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
        After a Codeforces round you took part in, the problems just past what you solved show up under Problems you tried, in Practice.
      </p>
    </section>
  );
}

/**
 * Contests (v1.8): three tabs, each its own route, so the screen stops being one 3,300px column.
 * Upcoming (`/contests`), Your rounds (`/contests/rounds`: the review cards, then every round in a
 * table) and Virtual contest (`/contests/virtual`). A running virtual contest leads every tab.
 */
export function Contests() {
  return (
    <div className="flex flex-col gap-6">
      <SegmentedTabs label="Contests sections" tabs={CONTESTS_TABS} />
      <div className="empty:hidden">
        <VirtualSection where="top" />
      </div>
      <Outlet />
    </div>
  );
}

/** Before the first update: what will be here, and the button that brings it. */
function NoContests({ title, children }: { title: string; children: ReactNode }) {
  const syncing = useSyncStore((s) => s.syncing);
  const run = useSyncStore((s) => s.run);
  const handles = useHandles().data;
  // With no handle at all there's nothing to update (a beginner who skipped them): say where to add one.
  const noHandles = handles !== undefined && !handles.codeforces && !handles.leetcode;
  return (
    <EmptyState
      icon={Swords}
      title={syncing ? "Loading contests…" : title}
      action={
        noHandles ? (
          <Button asChild variant="outline" size="sm">
            <Link to="/settings">Add a handle in Settings</Link>
          </Button>
        ) : (
          !syncing && (
            <Button variant="outline" size="sm" onClick={() => void run()}>
              <RefreshCw aria-hidden />
              {LABELS.updateNow}
            </Button>
          )
        )
      }
    >
      {children}
    </EmptyState>
  );
}

/** Contests → Upcoming: the next Codeforces round leads, then later Codeforces rounds, then LeetCode. */
export function ContestsUpcoming() {
  const { data, isLoading } = useContestsData();
  const nowMs = useNow(15_000);
  if (isLoading) return <p className="text-body-sm text-ink-muted">Loading contests…</p>;
  if (!data || data.upcoming.length === 0) {
    return (
      <NoContests title="No upcoming contests loaded">
        Upcoming Codeforces rounds are listed here first, with LeetCode weekly and biweekly contests below them. They load with every update, once you've added a Codeforces or LeetCode handle.
      </NoContests>
    );
  }
  const cf = data.upcoming.filter((c) => c.platform === "cf");
  const lc = data.upcoming.filter((c) => c.platform === "lc");
  const [next, ...laterCf] = cf;
  return (
    <div className="grid grid-cols-12 items-start gap-6">
      {next && (
        <div className="col-span-12">
          <NextRound c={next} attending={data.attending.has(next.id)} nowMs={nowMs} />
        </div>
      )}
      <div className="col-span-12 xl:col-span-7">
        <UpcomingList title="More Codeforces rounds" contests={laterCf} attending={data.attending} nowMs={nowMs} note="Reminders 1 hour and 10 minutes before rounds you'll attend." />
      </div>
      <div className="col-span-12 xl:col-span-5">
        <UpcomingList title="LeetCode" contests={lc} attending={data.attending} nowMs={nowMs} />
      </div>
    </div>
  );
}

/** Contests → Your rounds: one review card per Codeforces round you took part in, then every round in a table. */
export function ContestsRounds() {
  const { data, isLoading } = useContestsData();
  if (isLoading) return <p className="text-body-sm text-ink-muted">Loading your rounds…</p>;
  if (!data || data.past.length === 0) {
    return (
      <EmptyState
        icon={Swords}
        title="No rounds yet"
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/contests">See upcoming rounds</Link>
          </Button>
        }
      >
        After a Codeforces round you take part in, it shows here: what you solved, your rating change, and the problems to fix next. A virtual contest is a way to practise one before the real thing.
      </EmptyState>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <ContestReviewSection />
      <PastList past={data.past} />
    </div>
  );
}

/** Contests → Virtual contest: the picker and your past virtual contests (the running one leads the screen). */
export function ContestsVirtual() {
  return <VirtualSection where="column" />;
}
