import { Link } from "react-router-dom";
import { Network } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";

// Locked silhouette: the tree's shape with no topics, labels or values (structure, not data).
const NODES = [
  { x: 160, y: 40, r: 18 },
  { x: 80, y: 120, r: 15 },
  { x: 240, y: 120, r: 15 },
  { x: 40, y: 210, r: 12 },
  { x: 120, y: 210, r: 12 },
  { x: 200, y: 210, r: 12 },
  { x: 280, y: 210, r: 12 },
  { x: 160, y: 290, r: 12 },
] as const;
const EDGES: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6], [4, 7], [5, 7],
];

function LockedTree() {
  return (
    <svg viewBox="0 0 320 330" className="h-auto w-full max-w-[320px]" aria-hidden>
      {EDGES.map(([a, b]) => (
        <line
          key={`${a}-${b}`}
          x1={NODES[a]!.x}
          y1={NODES[a]!.y}
          x2={NODES[b]!.x}
          y2={NODES[b]!.y}
          stroke="var(--glass-border-strong)"
          strokeWidth={1.5}
        />
      ))}
      {NODES.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={n.r + 5} fill="none" stroke="var(--glass-border)" strokeWidth={3} strokeDasharray="3 5" />
          <circle cx={n.x} cy={n.y} r={n.r} fill="var(--abyss-sunken)" stroke="var(--glass-border-strong)" strokeWidth={1.5} />
        </g>
      ))}
    </svg>
  );
}

export function SkillTree() {
  return (
    <div className="glass-card grid grid-cols-1 items-center gap-10 p-8 md:grid-cols-[1fr_auto]">
      <EmptyState
        icon={Network}
        title="Your skill tree grows from solved problems"
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/settings">Check your handles</Link>
          </Button>
        }
      >
        Every topic you've practiced on Codeforces and LeetCode becomes a node, with a mastery ring
        that fills as the topic gets stronger. Nodes unlock after the first sync.
      </EmptyState>
      <LockedTree />
    </div>
  );
}
