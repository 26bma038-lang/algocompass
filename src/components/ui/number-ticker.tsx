import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "framer-motion";

const defaultFormat = (n: number) => Math.round(n).toLocaleString();

/** Last value shown per ticker id, for this app launch: revisits don't recount from 0. */
const lastShown = new Map<string, number>();

/**
 * Counts to `value` (DESIGN.md: 420ms ease-out). The first appearance in an app launch
 * counts up from 0; after that it only animates when the value actually changes.
 * Writes straight to the DOM node so React doesn't re-render every frame.
 */
export function NumberTicker({
  id,
  value,
  format = defaultFormat,
  className,
}: {
  /** Stable identity, e.g. "cf-rating". */
  id: string;
  value: number;
  /** Must be stable (module-level). */
  format?: (n: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const start = reduce ? value : (lastShown.get(id) ?? 0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const from = lastShown.get(id) ?? 0;
    const settle = () => {
      node.textContent = format(value);
      lastShown.set(id, value);
    };
    if (reduce || from === value) {
      settle();
      return;
    }
    const controls = animate(from, value, {
      duration: 0.42,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        node.textContent = format(v);
      },
      onComplete: settle,
    });
    // If interrupted, never leave a half-counted number on screen.
    return () => {
      controls.stop();
      settle();
    };
  }, [id, value, format, reduce]);

  return (
    <span className={className}>
      <span ref={ref} aria-hidden>
        {format(start)}
      </span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
