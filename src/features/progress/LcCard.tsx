import { Link } from "react-router-dom";
import { NumberTicker } from "@/components/ui/number-ticker";
import { useHomeData } from "@/data/queries";
import { useHandles } from "@/data/settings";
import { LABELS } from "@/lib/glossary";

const plain = (n: number) => String(Math.round(n));

/** v1.4: moved here from Today (Progress → Overview). */
type LcStatsRow = NonNullable<ReturnType<typeof useHomeData>["data"]>["lcStats"];

/** LeetCode is the classroom: a compact secondary card. */
export function LcCard({ lc }: { lc: LcStatsRow }) {
  const tracked = (useHandles().data?.leetcode ?? "") !== "";
  if (!lc && !tracked) {
    return (
      <section aria-labelledby="lc-title" className="glass-card flex h-full flex-col gap-2 p-6">
        <h2 id="lc-title" className="flex items-center gap-2 font-display text-headline font-semibold text-ink">
          <span aria-hidden className="size-2 rounded-full bg-platform-lc" />
          LeetCode
        </h2>
        <p className="text-body-sm text-ink-muted">
          Not tracked. LeetCode is where new topics are learned;{" "}
          <Link to="/settings" className="text-ink underline decoration-glass-border-strong underline-offset-4">
            add your username in Settings
          </Link>{" "}
          to count those solves too.
        </p>
      </section>
    );
  }
  const parts = lc
    ? [
        { label: "Easy", n: lc.easy },
        { label: "Medium", n: lc.medium },
        { label: "Hard", n: lc.hard },
      ]
    : [];
  return (
    <section aria-labelledby="lc-title" className="glass-card flex h-full flex-col gap-3 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="lc-title" className="flex items-center gap-2 font-display text-headline font-semibold text-ink">
          <span aria-hidden className="size-2 rounded-full bg-platform-lc" />
          LeetCode
        </h2>
        <span className="truncate text-body-sm text-ink-muted">{lc?.username ?? "…"}</span>
      </div>
      <div className="flex items-end justify-between gap-4">
        <p className="flex items-baseline gap-2">
          <span className="numeric font-display text-display leading-none font-semibold text-ink">
            {lc ? <NumberTicker id="lc-solved" value={lc.all_solved} format={plain} /> : "–"}
          </span>
          <span className="text-body-sm text-ink-muted">{lc ? "solved" : LABELS.notUpdated}</span>
        </p>
        {lc && (
          <dl className="flex gap-4">
            {parts.map((p) => (
              <div key={p.label} className="flex flex-col items-end">
                <dt className="text-label text-ink-muted">{p.label}</dt>
                <dd className="numeric text-title font-semibold text-ink">{p.n}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      {lc && (
        <p className="text-body-sm text-ink-muted">
          {lc.contest_rating ? `Contest rating ${Math.round(lc.contest_rating)}` : "No LeetCode contests yet"}
        </p>
      )}
    </section>
  );
}
