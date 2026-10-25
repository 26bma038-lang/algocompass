import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { SkillTree } from "@/features/skill-tree/SkillTree";
import { LABELS } from "@/lib/glossary";

/**
 * Progress → Topics → Show as map (v1.4): the Skill Tree canvas, for the people who love it. Lazy,
 * so @xyflow/react only loads here. --tree-above adds this page's "Show as list" row (32px + 24px
 * gap) to the tab row, so the canvas keeps its full height at 1100x700.
 */
export function TopicsMap() {
  return (
    <div className="flex flex-col gap-6 [--tree-above:120px]">
      <Link to="/progress/topics" className="flex h-8 items-center gap-1 self-start rounded-xs text-body-sm text-ink-muted hover:text-ink">
        <ChevronLeft aria-hidden className="size-4" />
        {LABELS.showAsList}
      </Link>
      <SkillTree />
    </div>
  );
}
