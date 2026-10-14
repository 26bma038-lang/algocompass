import { ExternalLink } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { isTauri } from "@tauri-apps/api/core";
import type { Contest } from "@/data/types";
import { cn } from "@/lib/utils";
import { useNow } from "./useNow";

export function countdown(start: number, nowMs: number): string {
  const s = start - Math.floor(nowMs / 1000);
  if (s <= 0) return "Live now";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `in ${d}d ${h}h`;
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}

export const when = (t: number) =>
  new Date(t * 1000).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** The platform label already says "Codeforces", so drop it from the round name. */
export const shortName = (c: Contest) => (c.platform === "cf" ? c.name.replace(/^Codeforces\s+/i, "") : c.name);

export function openContest(url: string) {
  if (isTauri()) void openUrl(url);
  else window.open(url, "_blank", "noopener");
}

/** The rest of the contest calendar, in time order (the next CF round leads in the Today card). */
export function ContestStrip({ contests }: { contests: readonly Contest[] }) {
  const nowMs = useNow();
  const shown = contests.slice(0, 4);

  return (
    <section aria-labelledby="contests-title" className="flex flex-col gap-3">
      <h2 id="contests-title" className="text-title font-semibold">
        Later contests
      </h2>
      {shown.length === 0 ? (
        <p className="glass-card p-5 text-body-sm text-ink-muted">No other upcoming contests are listed yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {shown.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => openContest(c.url)}
              className="glass-card flex flex-col items-start gap-2 p-4 text-left transition-[background-color,border-color] duration-[var(--dur-fast)] hover:border-glass-border-strong hover:bg-glass-hover"
            >
              <span className="flex w-full items-center gap-1.5 text-label text-ink-muted">
                <span aria-hidden className={cn("size-1.5 rounded-full", c.platform === "cf" ? "bg-platform-cf" : "bg-platform-lc")} />
                {c.platform === "cf" ? "Codeforces" : "LeetCode"}
                <ExternalLink aria-hidden className="ml-auto size-3.5" />
              </span>
              <span className="line-clamp-3 text-body-sm font-semibold text-ink">{shortName(c)}</span>
              <span className="mt-auto flex flex-col">
                <span className="numeric font-display text-title font-semibold text-ink">{countdown(c.startTime, nowMs)}</span>
                <span className="text-label whitespace-nowrap text-ink-muted">
                  {when(c.startTime)}
                  <span className="sr-only"> (opens in browser)</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
