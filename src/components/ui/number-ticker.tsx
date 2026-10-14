import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "framer-motion";

/**
 * Counts up to `value` (DESIGN.md: 420ms ease-out, only when the value changes).
 * Writes straight to the DOM node so React doesn't re-render every frame.
 */
export function NumberTicker({
  value,
  format = (n) => Math.round(n).toLocaleString(),
  className,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduce) {
      node.textContent = format(value);
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration: 0.42,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => (node.textContent = format(v)),
    });
    from.current = value;
    return () => controls.stop();
  }, [value, format, reduce]);

  return (
    <span ref={ref} className={className} aria-label={format(value)}>
      {format(0)}
    </span>
  );
}
