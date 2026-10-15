import { useEffect, useMemo, useRef, useState } from "react";
import type { DailyActivity } from "@/data/types";
import { dayKey, heatmapWeeks, intensity, mergeActivity, type HeatCell } from "@/engine/activity";
import { cn } from "@/lib/utils";

// Sequential ramp on the Rank Aura: one hue, empty → strong. Step 0 is an outlined empty cell.
const STEP_BG = [
  "var(--abyss-sunken)",
  "color-mix(in oklab, var(--accent) 35%, var(--abyss-sunken))",
  "color-mix(in oklab, var(--accent) 55%, var(--abyss-sunken))",
  "color-mix(in oklab, var(--accent) 78%, var(--abyss-sunken))",
  "var(--accent)",
];
const CELL = 15;
const GAP = 4;

const fmtDay = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const MONTH = (d: Date) => d.toLocaleDateString(undefined, { month: "short" });

function describe(c: HeatCell) {
  if (c.total === 0) return `${fmtDay(c.date)}: no activity`;
  const parts = [];
  if (c.cf) parts.push(`${c.cf} Codeforces accepted`);
  if (c.lc) parts.push(`${c.lc} LeetCode submission${c.lc === 1 ? "" : "s"}`);
  return `${fmtDay(c.date)}: ${parts.join(", ")}`;
}

/** Combined CF + LC activity: as many recent weeks as fit the card (today's week always visible). */
export function ActivityHeatmap({ activity }: { activity: readonly DailyActivity[] }) {
  const today = useMemo(() => new Date(), []);
  const todayKey = dayKey(today);
  const gridRef = useRef<HTMLDivElement>(null);
  const [weekCount, setWeekCount] = useState(30);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const fit = () => setWeekCount(Math.max(8, Math.min(53, Math.floor((el.clientWidth + GAP) / (CELL + GAP)))));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { weeks, max, activeDays, months } = useMemo(() => {
    const days = mergeActivity(activity);
    const weeks = heatmapWeeks(days, today, weekCount);
    const cells = weeks.flat().filter((c) => !c.future);
    return {
      weeks,
      max: Math.max(1, ...cells.map((c) => c.total)),
      activeDays: cells.filter((c) => c.total > 0).length,
      months: Math.max(1, Math.round((weekCount * 7) / 30.4)),
    };
  }, [activity, today, weekCount]);
  const [hover, setHover] = useState<HeatCell | null>(null);
  const summary = `${activeDays} active days in the last ${months} months`;

  return (
    <section aria-labelledby="heatmap-title" className="glass-card flex h-full flex-col gap-4 p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="heatmap-title" className="font-display text-headline font-semibold">
          Activity
        </h2>
        <p className="text-body-sm text-ink-muted">{hover ? describe(hover) : summary}</p>
      </div>
      <div ref={gridRef} role="img" aria-label={`Daily activity heatmap: ${summary}.`} className="flex justify-between gap-1">
        {weeks.map((col, w) => (
          <div key={w} aria-hidden className="flex shrink-0 flex-col gap-1" style={{ width: CELL }}>
            <span className="h-4 text-label leading-none whitespace-nowrap text-ink-faint">
              {col[0] && (w === 0 || col[0].date.getDate() <= 7) ? MONTH(col[0].date) : ""}
            </span>
            {col.map((c) => (
              <span
                key={c.day}
                onMouseEnter={() => setHover(c)}
                onMouseLeave={() => setHover(null)}
                className={cn(
                  "rounded-[3px]",
                  c.future && "invisible",
                  c.total === 0 && "border border-glass-border",
                  c.day === todayKey && (c.total > 0 ? "ring-[1.5px] ring-ember" : "outline-[1.5px] outline-dashed outline-ink-faint"),
                )}
                style={{ width: CELL, height: CELL, background: STEP_BG[intensity(c.total, max)] }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-label text-ink-muted" aria-hidden>
        Less
        {STEP_BG.map((bg, i) => (
          <span key={bg} className={cn("size-[11px] rounded-[3px]", i === 0 && "border border-glass-border")} style={{ background: bg }} />
        ))}
        More
        <span className="ml-auto">Codeforces accepted + LeetCode submissions per day</span>
      </div>
    </section>
  );
}
