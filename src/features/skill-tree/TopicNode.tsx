import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { motion, useReducedMotion } from "framer-motion";
import { Crosshair, Lock } from "lucide-react";
import { MasteryRing } from "@/components/MasteryRing";
import { isPromotion, type TreeNodeModel } from "@/engine/skillTree";
import type { TopicStatus } from "@/engine/strength";
import { topicIcon } from "@/lib/topicIcons";
import { cn } from "@/lib/utils";
import { NODE_W } from "./layout";

export type TopicNodeData = TreeNodeModel & {
  /** Dimmed by the active filter or search. */
  dimmed: boolean;
  selected: boolean;
  /** Score last time you looked, for the unlock sweep. */
  previousScore: number | undefined;
  onOpen: (id: string) => void;
  /** Keyboard focus landed here: pan the node into view if it's off the canvas. */
  onFocusNode: (id: string) => void;
};
export type TopicFlowNode = Node<TopicNodeData, "topic">;

const RING = 64;

export const STATUS_WORD: Record<TopicStatus, string> = {
  Locked: "Locked",
  Untouched: "Not tried",
  Weak: "Weak",
  Developing: "Developing",
  Strong: "Strong",
  Mastered: "Mastered",
};

/**
 * One topic: icon disc inside the mastery ring, then name and "score status" below.
 * Glow follows the tree's light rule (DESIGN.md Skill Tree): Mastered wears the Aura, Strong a
 * faint accent glow, everything else none. Work-on-next carries a labeled crosshair badge.
 */
function TopicNodeView({ data }: NodeProps<TopicFlowNode>) {
  const reduce = useReducedMotion();
  const Icon = topicIcon(data.id);
  const locked = data.status === "Locked";
  const untouched = data.status === "Untouched";
  const lit = data.status === "Strong" || data.status === "Mastered";
  const scored = !locked && !untouched;
  const unlocking = data.changedFrom !== null && isPromotion(data.changedFrom, data.status) && !reduce;
  const word = data.blindSpot && untouched ? "Blind spot" : STATUS_WORD[data.status];
  const label = `${data.name}: ${word}${scored ? `, ${data.score} of 100` : ""}${data.workOnNext ? ", work on next" : ""}`;

  return (
    <div
      className={cn("flex flex-col items-center transition-opacity duration-[var(--dur-fast)]", data.dimmed && "opacity-25")}
      style={{ width: NODE_W }}
    >
      <Handle type="target" position={Position.Top} className="!pointer-events-none !opacity-0" isConnectable={false} />
      <button
        type="button"
        aria-label={label}
        aria-expanded={data.selected}
        aria-controls="topic-panel"
        onClick={() => data.onOpen(data.id)}
        onFocus={() => data.onFocusNode(data.id)}
        className="group nodrag nopan flex flex-col items-center gap-1.5 rounded-md px-1 pt-1 pb-1.5 outline-none"
      >
        <span className="relative grid place-items-center" style={{ width: RING, height: RING }}>
          <span className={cn("absolute inset-0", data.status === "Strong" && "drop-shadow-[0_0_6px_color-mix(in_oklab,var(--accent)_30%,transparent)]")}>
            <MasteryRing score={data.score} status={data.status} size={RING} from={unlocking ? data.previousScore ?? 0 : undefined} />
          </span>
          <span
            className={cn(
              "relative grid size-[46px] place-items-center rounded-full border transition-colors duration-[var(--dur-fast)]",
              locked
                ? "border-glass-border bg-abyss-sunken"
                : data.status === "Mastered"
                  ? "border-accent-line bg-accent-soft shadow-aura"
                  : lit
                    ? "border-accent-line bg-abyss-raised"
                    : "border-glass-border-strong bg-abyss-raised group-hover:bg-glass-hover",
            )}
          >
            {locked ? (
              <Lock aria-hidden className="size-4 text-ink-faint" strokeWidth={1.8} />
            ) : (
              <Icon aria-hidden className={cn("size-[18px]", untouched ? "text-ink-muted" : lit ? "text-accent" : "text-ink")} strokeWidth={1.8} />
            )}
          </span>
          {data.workOnNext && (
            // "Work on next" marker (one of the three topics in the tiles above): an accent target, labelled.
            <span title="Work on next" className="absolute -top-1.5 -right-2.5 grid size-6 place-items-center">
              <span className="absolute size-6 rounded-full bg-accent opacity-50 motion-safe:animate-[next-pulse_2.4s_var(--ease-out)_infinite]" />
              <span className="relative grid size-6 place-items-center rounded-full border-2 border-abyss-raised bg-accent">
                <Crosshair aria-hidden className="size-3.5 text-accent-ink" strokeWidth={2.4} />
                <span className="sr-only">Work on next</span>
              </span>
            </span>
          )}
          {data.selected && (
            // Selection: a solid outer ring with a gap, so it reads even when the accent is Newbie gray.
            <span aria-hidden className="pointer-events-none absolute -inset-[5px] rounded-full border-2 border-ink/80" />
          )}
          {unlocking && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full border-2 border-accent"
              initial={{ opacity: 0.9, scale: 0.9 }}
              animate={{ opacity: 0, scale: 1.45 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            />
          )}
        </span>
        <span className="flex flex-col items-center gap-0.5 rounded-sm bg-[color-mix(in_oklab,var(--abyss)_40%,transparent)] px-1.5 py-0.5">
          <span
            className={cn(
              "line-clamp-2 max-w-[106px] text-center text-body-sm leading-tight font-semibold",
              locked ? "text-ink-faint" : "text-ink",
              "group-hover:underline group-hover:decoration-glass-border-strong group-hover:underline-offset-4",
            )}
          >
            {data.name}
          </span>
          <span className={cn("flex items-baseline gap-1 text-label", locked ? "text-ink-faint" : data.workOnNext ? "text-ink" : "text-ink-muted")}>
            {scored && <span className="numeric font-display font-semibold text-ink">{data.score}</span>}
            {word}
          </span>
        </span>
      </button>
      <Handle type="source" position={Position.Bottom} className="!pointer-events-none !opacity-0" isConnectable={false} />
    </div>
  );
}

export const TopicNode = memo(TopicNodeView);
