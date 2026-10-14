import { useMemo, useState } from "react";
import type { DailyActivity } from "@/data/types";
import { heatmapWeeks, intensity, mergeActivity, type HeatCell } from "@/engine/activity";
import { cn } from "@/lib/utils";

// Sequential ramp on the Rank Aura: one hue, light → strong.
const STEP_BG = [
  "var(--glass-border)",
  "color-mix(in oklab, var(--accent) 22%, var(--abyss-sunken))",
  "color-mix(in oklab, var(--accent) 42%, var(--abyss-sunken))",
  "color-mix(in oklab, var(--accent) 68%, var(--abyss-sunken))",
  "var(--accent)",
];

/** ~8 months: fills the card at the 1100px minimum window without scrolling. */
const WEEKS = 35;

const fmtDay = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const MONTH = (d: Date) => d.toLocaleDateString(undefined, { month: "short" });

function describe(c: HeatCell) {
  if (c.total === 0) return `${fmtDay(c.date)}: no activity`;
  const parts = [];
  if (c.cf) parts.push(`${c.cf} Codeforces accepted`);
  if (c.lc) parts.push(`${c.lc} LeetCode submission${c.lc === 1 ? "" : "s"}`);
  return `${fmtDay(c.date)}: ${parts.join(", ")}`;
}

/** Combined CF + LC activity, last ~8 months. */
export function ActivityHeatmap({ activity }: { activity: readonly DailyActivity[] }) {
  const today = useMemo(() => new Date(), []);
  const { weeks, max, activeDays } = useMemo(() => {
    const days = mergeActivity(activity);
    const weeks = heatmapWeeks(days, today, WEEKS);
    const cells = weeks.flat().filter((c) => !c.future);
    return {
      weeks,
      max: Math.max(1, ...cells.map((c) => c.total)),
      activeDays: cells.filter((c) => c.total > 0).length,
    };
  }, [activity, today]);
  const [hover, setHover] = useState<HeatCell | null>(null);

  return (
    <section aria-labelledby="heatmap-title" className="glass-card flex flex-col gap-4 p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="heatmap-title" className="text-title font-semibold">
          Activity
        </h2>
        <p className="text-body-sm text-ink-muted" aria-live="polite">
          {hover ? describe(hover) : `${activeDays} active days in the last 8 months`}
        </p>
      </div>
      <div className="flex justify-between gap-1 overflow-x-auto pb-1" role="group" aria-label="Daily activity, last 8 months">
        {weeks.map((col, w) => (
          <div key={w} className="flex w-[15px] shrink-0 flex-col gap-1">
            <span aria-hidden className="h-4 overflow-visible text-label leading-none whitespace-nowrap text-ink-faint">
              {col[0] && (w === 0 || col[0].date.getDate() <= 7) ? MONTH(col[0].date) : ""}
            </span>
            {col.map((c) => (
              <span
                key={c.day}
                role="img"
                aria-label={describe(c)}
                onMouseEnter={() => setHover(c)}
                onMouseLeave={() => setHover(null)}
                className={cn("size-[15px] rounded-[3px]", c.future && "opacity-0")}
                style={{ background: STEP_BG[intensity(c.total, max)] }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-label text-ink-faint" aria-hidden>
        Less
        {STEP_BG.map((bg) => (
          <span key={bg} className="size-[11px] rounded-[3px]" style={{ background: bg }} />
        ))}
        More
        <span className="ml-auto">CF accepted + LC submissions per day</span>
      </div>
    </section>
  );
}
