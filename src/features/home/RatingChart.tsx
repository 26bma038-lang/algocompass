import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import type { CfRatingChange, LcContestEntry } from "@/data/types";
import { bandForRating, RANK_BANDS } from "@/lib/rank";

interface Point {
  t: number;
  cf?: number;
  lc?: number;
  label: string;
  delta?: number;
}

const fmtDate = (t: number) => new Date(t * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function ChartTooltip({ active, payload }: TooltipContentProps) {
  const p = payload?.[0]?.payload as Point | undefined;
  if (!active || !p) return null;
  return (
    <div className="rounded-xs border border-glass-border-strong bg-abyss-raised px-3 py-2 text-body-sm shadow-float">
      <p className="font-semibold text-ink">{p.label}</p>
      <p className="text-ink-muted">{fmtDate(p.t)}</p>
      {p.cf !== undefined && (
        <p className="numeric mt-1 text-ink">
          Codeforces {p.cf}
          {p.delta !== undefined && (
            <span className="text-ink-muted"> ({p.delta >= 0 ? "+" : ""}{p.delta})</span>
          )}
        </p>
      )}
      {p.lc !== undefined && <p className="numeric mt-1 text-ink">LeetCode {Math.round(p.lc)}</p>}
    </div>
  );
}

/** CF rating over time on CF's own rank bands; LC contest rating joins on the same axis once it exists. */
export function RatingChart({
  cf,
  lc,
  rating,
}: {
  cf: readonly CfRatingChange[];
  lc: readonly LcContestEntry[];
  rating: number | null;
}) {
  const next = rating !== null ? bandForRating(rating).next : null;
  const data = useMemo<Point[]>(
    () =>
      [
        ...cf.map((r) => ({ t: r.at, cf: r.newRating, label: r.contestName, delta: r.newRating - r.oldRating })),
        ...lc.map((r) => ({ t: r.startTime, lc: r.rating, label: r.title })),
      ].sort((a, b) => a.t - b.t),
    [cf, lc],
  );
  const values = data.flatMap((d) => [d.cf, d.lc]).filter((v): v is number => v !== undefined);
  const lo = Math.max(0, Math.floor((Math.min(...values) - 100) / 200) * 200);
  const hi = Math.ceil((Math.max(...values, next?.min ?? 0) + 150) / 200) * 200;
  const first = cf[0];
  const latest = cf[cf.length - 1];
  const summary = latest && first
    ? `Codeforces rating ${latest.newRating} after ${cf.length} rated contests, from ${first.newRating} on ${fmtDate(first.at)}.${next && rating !== null ? ` ${next.min - rating} points to ${next.label}.` : ""}`
    : "No rated contests yet";
  const step = hi - lo > 1200 ? 400 : hi - lo > 600 ? 200 : 100;
  const ticks = Array.from({ length: Math.floor((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
  const bands = RANK_BANDS.map((b, i) => ({
    ...b,
    from: Number.isFinite(b.min) ? b.min : 0,
    to: RANK_BANDS[i + 1]?.min ?? 5000,
  })).filter((b) => b.to > lo && b.from < hi);

  return (
    <section aria-labelledby="rating-chart-title" className="glass-card flex flex-col gap-4 p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="rating-chart-title" className="font-display text-headline font-semibold text-ink">
          Rating
        </h2>
        {lc.length > 0 && (
          <div className="flex items-center gap-4 text-label text-ink-muted">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-0.5 w-3 rounded-full bg-platform-cf" />
              Codeforces
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-0.5 w-3 rounded-full bg-platform-lc" />
              LeetCode
            </span>
          </div>
        )}
      </div>
      {data.length === 0 ? (
        <p className="py-10 text-body-sm text-ink-muted">Your rating graph starts after your first rated contest.</p>
      ) : (
        <div className="h-[220px]" role="img" aria-label={summary}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 88, bottom: 0, left: -8 }} accessibilityLayer={false}>
              {bands.map((b) => (
                <ReferenceArea
                  key={b.rank}
                  y1={Math.max(b.from, lo)}
                  y2={Math.min(b.to, hi)}
                  fill={`var(--${b.token})`}
                  fillOpacity={0.1}
                  strokeOpacity={0}
                  ifOverflow="hidden"
                  label={{ value: b.label, position: "right", fill: "var(--ink-faint)", fontSize: 12 }}
                />
              ))}
              <CartesianGrid vertical={false} stroke="var(--glass-border)" />
              <XAxis
                dataKey="t"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={fmtDate}
                tick={{ fill: "var(--ink-muted)", fontSize: 12 }}
                axisLine={{ stroke: "var(--glass-border)" }}
                tickLine={false}
                minTickGap={40}
                padding={{ left: 12, right: 12 }}
              />
              <YAxis
                domain={[lo, hi]}
                ticks={ticks}
                tick={{ fill: "var(--ink-muted)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={48}
                allowDecimals={false}
              />
              {next && rating !== null && (
                <ReferenceLine
                  y={next.min}
                  stroke="var(--rank-next)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.8}
                  label={{ value: `${next.label} · ${next.min - rating} to go`, position: "insideTopLeft", fill: "var(--ink-muted)", fontSize: 12 }}
                />
              )}
              <Tooltip content={ChartTooltip} cursor={{ stroke: "var(--glass-border-strong)" }} isAnimationActive={false} />
              <Line
                dataKey="cf"
                name="Codeforces"
                connectNulls
                stroke="var(--platform-cf)"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                dot={{ r: 4, fill: "var(--platform-cf)", stroke: "var(--abyss-raised)", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: "var(--platform-cf)", stroke: "var(--abyss-raised)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
              {lc.length > 0 && (
                <Line
                  dataKey="lc"
                  name="LeetCode"
                  connectNulls
                  stroke="var(--platform-lc)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "var(--platform-lc)", stroke: "var(--abyss-raised)", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {lc.length === 0 && cf.length > 0 && (
        <p className="text-body-sm text-ink-muted">Your LeetCode contest rating joins this chart after your first LeetCode contest.</p>
      )}
    </section>
  );
}
