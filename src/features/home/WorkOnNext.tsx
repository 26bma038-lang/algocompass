import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { ModeBadge } from "@/components/practice/ModeBadge";
import { ProblemRow } from "@/components/practice/ProblemRow";
import { useRecommender } from "@/data/recommendations";
import { useUiStore } from "@/data/uiStore";

/**
 * Next Topic, inside the Today card: which topic, why (one sentence), whether it's learned on
 * LeetCode or sharpened on Codeforces, and the two problems to start with.
 */
export function WorkOnNext() {
  const { data: rec } = useRecommender();
  const openTopic = useUiStore((s) => s.openTopic);
  const next = rec?.nextTopic;
  if (!rec || !next) return null;
  const problems = next.mode === "learn" ? rec.learn(next.topicId, 2) : rec.sharpen(next.topicId, 2);

  return (
    <div className="flex flex-col gap-2 rounded-md border border-glass-border bg-abyss-sunken p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-label text-ink-muted">Work on next</span>
        <ModeBadge mode={next.mode} />
      </div>
      <button
        type="button"
        onClick={() => openTopic(next.topicId)}
        className="group flex items-center gap-2 self-start rounded-xs text-left"
        aria-label={`${next.name}: open topic details`}
      >
        <span className="text-title font-semibold text-ink group-hover:underline group-hover:decoration-glass-border-strong group-hover:underline-offset-4">
          {next.name}
        </span>
        <ArrowRight aria-hidden className="size-4 text-ink-muted transition-transform duration-[var(--dur-fast)] group-hover:translate-x-0.5" />
      </button>
      <p className="text-body-sm text-ink-muted">{next.why}</p>
      {problems.length > 0 && (
        <ul className="-mx-2 flex flex-col">
          {problems.map((p) => (
            <ProblemRow key={p.id} p={p} density="compact" />
          ))}
        </ul>
      )}
      <Link to="/practice" className="self-start text-body-sm text-ink-muted underline decoration-glass-border-strong underline-offset-4 hover:text-ink">
        Today's mix and more in Practice
      </Link>
    </div>
  );
}
