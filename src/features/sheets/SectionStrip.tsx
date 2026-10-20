import type { Progress } from "@/engine/sheets";
import { cn } from "@/lib/utils";

/**
 * A sheet's shape at a glance: one chamfered segment per section (step, day, topic), each filling
 * with the accent as that section gets done. It echoes the run meter and the level plate. With
 * `onSelect` every segment is a button that jumps to its section. No halo (glow budget).
 */
export function SectionStrip({
  sections,
  titles,
  label,
  onSelect,
  current,
  size = "md",
  className,
}: {
  sections: readonly Progress[];
  titles: readonly string[];
  /** "Step", "Day"…: names each segment for screen readers and tooltips. */
  label: string;
  onSelect?: (index: number) => void;
  /** The section holding "Next in this sheet": outlined. */
  current?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const h = size === "sm" ? "h-2" : "h-3";
  const clip = size === "sm" ? "[clip-path:polygon(3px_0,100%_0,calc(100%-3px)_100%,0_100%)]" : "[clip-path:polygon(4px_0,100%_0,calc(100%-4px)_100%,0_100%)]";
  const Seg = onSelect ? "button" : "span";
  return (
    <span
      role={onSelect ? "group" : "img"}
      aria-label={onSelect ? `${label}s` : `${sections.filter((s) => s.total && s.done === s.total).length} of ${sections.length} ${label.toLowerCase()}s done`}
      className={cn("flex min-w-0 items-center gap-[3px]", className)}
    >
      {sections.map((s, i) => {
        const fill = s.total ? s.done / s.total : 0;
        const name = `${label} ${i + 1}: ${titles[i] ?? ""}, ${s.done} of ${s.total} done`;
        return (
          <Seg
            key={i}
            {...(onSelect ? { type: "button" as const, onClick: () => onSelect(i), "aria-label": name, title: name } : { "aria-hidden": true, title: name })}
            className={cn(
              "flex min-w-[5px] flex-1 items-center rounded-[2px]",
              onSelect && "cursor-pointer py-1.5 transition-opacity duration-[var(--dur-fast)] hover:opacity-75",
            )}
          >
            {/* The chamfer is on an inner track, so a button's focus ring stays whole. */}
            <span
              className={cn(
                "relative block w-full overflow-hidden bg-glass-border-strong",
                // The section you're in stands taller: position, not colour, says "you are here".
                current === i ? (size === "sm" ? "h-3.5" : "h-5") : h,
                clip,
              )}
            >
              <span
                className="absolute inset-0 origin-left bg-accent transition-transform duration-[var(--dur-slow)] ease-out-quint"
                style={{ transform: `scaleX(${fill})` }}
              />
            </span>
          </Seg>
        );
      })}
    </span>
  );
}
