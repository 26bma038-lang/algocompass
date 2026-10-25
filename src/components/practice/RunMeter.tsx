/**
 * Today's run: one chamfered segment per mix problem, filling as you solve them. It echoes the
 * level badge's plate and the mastery ring's segments. Accent fill, no halo (glow budget).
 */
export function RunMeter({ done, total }: { done: number; total: number }) {
  return (
    <span role="img" aria-label={`${done} of ${total} solved today`} className="flex items-center gap-1">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className="relative h-2 w-6 overflow-hidden bg-glass-border-strong [clip-path:polygon(3px_0,100%_0,calc(100%-3px)_100%,0_100%)]"
        >
          <span
            className="absolute inset-0 origin-left bg-accent transition-transform duration-[var(--dur-slow)] ease-out-quint"
            style={{ transform: `scaleX(${i < done ? 1 : 0})` }}
          />
        </span>
      ))}
    </span>
  );
}
