import { Breadcrumb } from "@/components/Breadcrumb";
import { SkillTree } from "@/features/skill-tree/SkillTree";
import { LABELS } from "@/lib/glossary";

/**
 * Progress → Topics → Show as map (v1.4): the Skill Tree canvas, for the people who love it. Lazy,
 * so @xyflow/react only loads here. --tree-above adds this page's breadcrumb row (32px + 24px gap;
 * v1.8, was a "Show as list" link) to the tab row, so the canvas keeps its full height at 1100x700.
 */
export function TopicsMap() {
  return (
    <div className="flex flex-col gap-6 [--tree-above:120px]">
      <Breadcrumb crumbs={[{ label: "Progress", to: "/progress" }, { label: LABELS.topics, to: "/progress/topics" }, { label: "Map" }]} />
      <SkillTree />
    </div>
  );
}
