import { useRef, type KeyboardEvent } from "react";
import { Check } from "lucide-react";
import { THEMES, useThemeStore, type ThemeId } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * Theme picker: Light, Dark, or System (follows Windows, live). Each swatch is drawn inside its own
 * [data-theme] wrapper, so it shows that theme's real tokens; System shows both halves.
 * A radiogroup: arrows move and select, Tab leaves the group; the choice applies instantly.
 */
function Swatch({ scheme, className }: { scheme: "light" | "dark"; className?: string }) {
  return (
    <span data-theme={scheme} className={cn("flex flex-col justify-end gap-1.5 bg-[var(--abyss)] p-2.5", className)}>
      <span className="h-2 w-3/5 rounded-full bg-[var(--accent)]" />
      <span className="h-1.5 w-4/5 rounded-full bg-[var(--ink-faint)] opacity-60" />
      <span className="h-5 rounded-xs border border-[var(--glass-border-strong)] bg-[var(--abyss-raised)]" />
    </span>
  );
}
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
      <h2 id="theme-title" className="font-display text-headline font-semibold text-ink">
        Theme
      </h2>
      <p className="mt-1 max-w-[56ch] text-body text-ink-muted">
        Light, Dark, or System to follow Windows (it switches with it). Your Codeforces rank colour stays on your rating and rank progress.
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
              <span aria-hidden className="flex h-20 overflow-hidden rounded-sm border border-glass-border">
                {t.id === "system" ? (
                  <>
                    <Swatch scheme="light" className="flex-1" />
                    <Swatch scheme="dark" className="flex-1" />
                  </>
                ) : (
                  <Swatch scheme={t.id} className="flex-1" />
                )}
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
