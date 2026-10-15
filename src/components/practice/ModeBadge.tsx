import type { TopicMode } from "@/engine/recommender";
import { cn } from "@/lib/utils";

/**
 * Where a topic is practiced right now: "Learn on LeetCode" or "Sharpen on Codeforces".
 * A chip with the platform's dot (platform colors identify platforms only, never chrome).
 */
export function ModeBadge({ mode, short = false, className }: { mode: TopicMode; short?: boolean; className?: string }) {
  const learn = mode === "learn";
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-glass-border bg-glass px-2.5 text-label text-ink-muted",
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", learn ? "bg-platform-lc" : "bg-platform-cf")} />
      {learn ? (short ? "Learn" : "Learn on LeetCode") : short ? "Sharpen" : "Sharpen on Codeforces"}
    </span>
  );
}
