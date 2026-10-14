import { motion, useReducedMotion } from "framer-motion";
import type { TopicStatus } from "@/engine/strength";

const SEGMENTS = 10;
const GAP_DEG = 7;

function arc(cx: number, cy: number, r: number, fromDeg: number, toDeg: number): string {
  const p = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return `${(cx + r * Math.cos(rad)).toFixed(2)} ${(cy + r * Math.sin(rad)).toFixed(2)}`;
  };
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `M ${p(fromDeg)} A ${r} ${r} 0 ${large} 1 ${p(toDeg)}`;
}

/**
 * The mastery ring (DESIGN.md Shapes): a 10-segment arc, one segment per 10 points of strength,
 * clockwise from 12 o'clock. Locked is a dashed hairline circle with no segments.
 * `from` (a previous score) sweeps the newly earned segments in once, for unlocks.
 */
export function MasteryRing({
  score,
  status,
  size,
  stroke = 4,
  from,
}: {
  score: number;
  status: TopicStatus;
  size: number;
  stroke?: number;
  from?: number;
}) {
  const reduce = useReducedMotion();
  const c = size / 2;
  const r = c - stroke / 2 - 1;
  const span = 360 / SEGMENTS;

  if (status === "Locked") {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="block">
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--glass-border-strong)" strokeWidth={1.5} strokeDasharray="3 5" />
      </svg>
    );
  }

  const value = Math.max(0, Math.min(100, score)) / 10;
  const start = from === undefined ? value : Math.max(0, Math.min(100, from)) / 10;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="block">
      {Array.from({ length: SEGMENTS }, (_, i) => {
        const a0 = i * span + GAP_DEG / 2;
        const a1 = (i + 1) * span - GAP_DEG / 2;
        const fill = Math.max(0, Math.min(1, value - i));
        const isNew = i >= Math.floor(start) && fill > 0 && start < value;
        return (
          <g key={i}>
            <path d={arc(c, c, r, a0, a1)} fill="none" stroke="var(--glass-border-strong)" strokeWidth={stroke} strokeLinecap="butt" />
            {fill > 0 && (
              <motion.path
                d={arc(c, c, r, a0, a0 + (a1 - a0) * fill)}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={stroke}
                strokeLinecap="butt"
                initial={isNew && !reduce ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.16, delay: isNew ? 0.12 + (i - Math.floor(start)) * 0.05 : 0, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
