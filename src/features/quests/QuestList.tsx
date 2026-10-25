import { useEffect, useState } from "react";
import { Check, GraduationCap, ListChecks, Repeat } from "lucide-react";
import { useUiStore } from "@/data/uiStore";
import type { QuestState } from "@/engine/quests";
import { cn } from "@/lib/utils";

/** Fill for a quest's progress: accent, scaleX over 420ms (the same fill the run meter uses). */
export function QuestBar({ value, className }: { value: number; className?: string }) {
  return (
    <span aria-hidden className={cn("relative block h-1 overflow-hidden rounded-full bg-glass-border-strong", className)}>
      <span
        className="absolute inset-0 origin-left rounded-full bg-accent transition-transform duration-[var(--dur-slow)] ease-out-quint"
        style={{ transform: `scaleX(${Math.max(0, Math.min(1, value))})` }}
      />
    </span>
  );
}

/**
 * Plays a quest's reward moment once: an Aura pulse on its card. It waits until the window is
 * visible, so a quest finished while AlgoCompass sat in the tray still gets its moment.
 */
export function useRewardPulse(questId: string): boolean {
  const pending = useUiStore((s) => s.rewards.includes(questId));
  const clear = useUiStore((s) => s.clearReward);
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (!pending) return;
    let t: number | undefined;
    const play = () => {
      if (document.visibilityState !== "visible") return;
      setPulse(true);
      t = window.setTimeout(() => {
        setPulse(false);
        clear(questId);
      }, 760);
    };
    play();
    document.addEventListener("visibilitychange", play);
    return () => {
      document.removeEventListener("visibilitychange", play);
      if (t) window.clearTimeout(t);
    };
  }, [pending, questId, clear]);
  return pulse;
}

function QuestMark({ q }: { q: QuestState }) {
  if (q.done) {
    return (
      <span className="grid size-7 shrink-0 place-items-center rounded-sm bg-accent-soft">
        <Check aria-hidden className="size-4 text-success" strokeWidth={2.4} />
      </span>
    );
  }
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-sm bg-abyss-sunken">
      {q.kind === "any_solves" ? (
        <Repeat aria-hidden className="size-3.5 text-ink-muted" strokeWidth={1.8} />
      ) : q.kind === "lesson_step" ? (
        <GraduationCap aria-hidden className="size-3.5 text-ink-muted" strokeWidth={1.8} />
      ) : q.kind === "sheet" ? (
        <ListChecks aria-hidden className="size-3.5 text-ink-muted" strokeWidth={1.8} />
      ) : (
        <span aria-hidden className={cn("size-1.5 rounded-full", q.kind === "cf_topic" ? "bg-platform-cf" : "bg-platform-lc")} />
      )}
    </span>
  );
}

const statusText = (q: QuestState) => (q.done ? "Done" : `${q.progress} of ${q.target}`);

/** One quest. `compact` is the Today checklist line; the full row is the TodayQuestsCard row. */
export function QuestRow({ q, compact = false, children }: { q: QuestState; compact?: boolean; children?: React.ReactNode }) {
  const pulse = useRewardPulse(q.id);
  if (compact) {
    return (
      <li className={cn("flex items-start gap-2 rounded-xs", pulse && "aura-pulse")}>
        {q.done ? (
          <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-success" strokeWidth={2.4} />
        ) : (
          <span aria-hidden className="mt-[5px] size-2.5 shrink-0 rounded-full border border-glass-border-strong" />
        )}
        <span className={cn("min-w-0 flex-1 text-body-sm leading-snug", q.done ? "text-ink-muted" : "text-ink")}>
          {q.title}
          <span className="sr-only">. {statusText(q)}</span>
        </span>
        {!q.done && q.target > 1 && <span className="numeric text-label text-ink-muted">{q.progress}/{q.target}</span>}
      </li>
    );
  }
  return (
    <li className={cn("flex flex-col gap-3 rounded-md border border-glass-border bg-abyss-sunken p-4", pulse && "aura-pulse")}>
      <div className="flex items-center gap-3">
        <QuestMark q={q} />
        <span className="min-w-0 flex-1">
          <span className={cn("block text-body font-semibold", q.done ? "text-ink-muted" : "text-ink")}>{q.title}</span>
          <span className="flex items-center gap-1.5 text-label text-ink-muted">
            {q.done ? (
              <>
                <span className="text-ink">Done</span>, +{q.xp} XP earned
              </>
            ) : (
              <>+{q.xp} XP</>
            )}
          </span>
        </span>
        <span className="numeric font-display text-title font-semibold text-ink">
          {q.progress}
          <span className="text-ink-muted">/{q.target}</span>
        </span>
      </div>
      <QuestBar value={q.progress / q.target} />
      {children}
    </li>
  );
}
