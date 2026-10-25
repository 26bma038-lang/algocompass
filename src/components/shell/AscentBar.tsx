import { bandForRating, bandProgress } from "@/lib/rank";

/**
 * 2px meter under the top bar: progress through the current CF rank band, shading from
 * the current rank color into the next one. Shows an empty track until a real rating exists.
 */
export function AscentBar({ rating }: { rating: number | null }) {
  const progress = rating === null ? 0 : bandProgress(rating);
  const next = rating === null ? null : bandForRating(rating).next;
  const label =
    rating === null
      ? "Rank progress appears after the first update"
      : next
        ? `${Math.round(progress * 100)}% of the way to ${next.label}`
        : "Top rank reached";

  return (
    <div
      role="meter"
      aria-label="Progress to next rank"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      aria-valuetext={label}
      title={label}
      className="relative h-[2px] w-full bg-glass-border-strong"
    >
      <div
        className="absolute inset-0 origin-left transition-transform duration-[var(--dur-slow)] ease-out-quint"
        style={{
          transform: `scaleX(${progress})`,
          background: "linear-gradient(90deg, var(--rank), var(--rank-next))",
          boxShadow: progress > 0 ? "0 0 10px var(--rank-glow)" : undefined,
        }}
      />
    </div>
  );
}
