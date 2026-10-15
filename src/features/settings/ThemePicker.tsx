import { useRef, type KeyboardEvent } from "react";
import { Check } from "lucide-react";
import { THEMES, useThemeStore, type ThemeId } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * Theme picker: three live swatches. Each swatch is drawn inside its own [data-theme] wrapper, so
 * it shows that theme's real tokens (ground, glass, accent, accent-2), not hard-coded colours.
 * A radiogroup: arrows move and select, Tab leaves the group; the choice applies instantly.
 */
export function ThemeSection() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent, i: number) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + THEMES.length) % THEMES.length;
    setTheme(THEMES[next]!.id);
    refs.current[next]?.focus();
  };

  return (
    <section aria-labelledby="theme-title" className="glass-card p-6">
      <h2 id="theme-title" className="text-title font-semibold text-ink">
        Theme
      </h2>
      <p className="mt-1 max-w-[56ch] text-body text-ink-muted">
        Colours for the whole app. Your Codeforces rank colour stays on your rating and rank progress.
      </p>
      <div role="radiogroup" aria-labelledby="theme-title" className="mt-5 grid grid-cols-3 gap-4">
        {THEMES.map((t, i) => {
          const selected = theme === t.id;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTheme(t.id as ThemeId)}
              onKeyDown={(e) => onKey(e, i)}
              className={cn(
                "flex flex-col gap-2 rounded-md border p-2 text-left transition-colors duration-[var(--dur-fast)]",
                selected ? "border-accent bg-accent-soft" : "border-glass-border hover:border-glass-border-strong",
              )}
            >
              {/* The swatch renders in the theme it previews. */}
              <span data-theme={t.id} aria-hidden className="flex h-20 flex-col justify-end gap-1.5 rounded-sm bg-[var(--abyss)] p-2.5">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 flex-1 rounded-full bg-[var(--accent)]" />
                  <span className="size-2 rounded-full bg-[var(--accent-2)]" />
                </span>
                <span className="h-5 rounded-xs border border-[var(--glass-border-strong)] bg-[var(--glass)]" />
              </span>
              <span className="flex items-center justify-between gap-2 px-1">
                <span className="flex flex-col">
                  <span className="text-body-sm font-semibold text-ink">{t.name}</span>
                  <span className="text-label text-ink-muted">{t.blurb}</span>
                </span>
                {selected && <Check aria-hidden className="size-4 shrink-0 text-accent" strokeWidth={2.4} />}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
