import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { isTauri } from "@tauri-apps/api/core";
import type { Contest } from "@/data/types";
import { cn } from "@/lib/utils";

function countdown(start: number, nowMs: number): string {
  const s = start - Math.floor(nowMs / 1000);
  if (s <= 0) return "Live now";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `in ${d}d ${h}h`;
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}

const when = (t: number) =>
  new Date(t * 1000).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

function open(url: string) {
  if (isTauri()) void openUrl(url);
  else window.open(url, "_blank", "noopener");
}

/**
 * Upcoming contests. The next Codeforces round leads (CF is the main event);
 * everything else follows in time order, LeetCode included.
 */
export function ContestStrip({ contests }: { contests: readonly Contest[] }) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const lead = contests.find((c) => c.platform === "cf");
  const rest = contests.filter((c) => c !== lead).slice(0, 4);

  return (
    <section aria-labelledby="contests-title" className="flex flex-col gap-3">
      <h2 id="contests-title" className="text-title font-semibold">
        Upcoming contests
      </h2>
      {contests.length === 0 ? (
        <p className="glass-card p-5 text-body-sm text-ink-muted">No upcoming contests are listed yet.</p>
      ) : (
        <div className="grid grid-cols-12 gap-4">
          {[lead, ...rest].filter(Boolean).map((c, i) => {
            const isLead = i === 0 && c!.platform === "cf";
            return (
              <button
                key={c!.id}
                type="button"
                onClick={() => open(c!.url)}
                className={cn(
                  "glass-card group flex flex-col items-start gap-2 p-4 text-left transition-[background-color,border-color] duration-[var(--dur-fast)] hover:border-glass-border-strong hover:bg-glass-hover",
                  isLead ? "col-span-12 lg:col-span-4" : "col-span-6 lg:col-span-2",
                )}
                style={isLead ? { boxShadow: "var(--shadow-slab), var(--shadow-aura)" } : undefined}
              >
                <span className="flex w-full items-center gap-1.5 text-label text-ink-muted">
                  <span aria-hidden className={cn("size-1.5 rounded-full", c!.platform === "cf" ? "bg-platform-cf" : "bg-platform-lc")} />
                  {c!.platform === "cf" ? "Codeforces" : "LeetCode"}
                  <ExternalLink aria-hidden className="ml-auto size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                </span>
                <span className={cn("line-clamp-2 font-semibold text-ink", isLead ? "text-title" : "text-body-sm")}>{c!.name}</span>
                <span className="mt-auto flex w-full flex-wrap items-baseline justify-between gap-x-2">
                  <span className={cn("numeric font-display font-semibold", isLead ? "text-headline text-ink" : "text-title text-ink")}>
                    {countdown(c!.startTime, nowMs)}
                  </span>
                  <span className="text-label text-ink-muted">{when(c!.startTime)}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
