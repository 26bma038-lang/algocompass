import { GraduationCap, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useHandles } from "@/data/settings";
import { useUpdatePrefs, type AppMode, type AppPrefs } from "@/data/prefs";
import { LangToggle } from "@/features/path/PathView";
import { cn } from "@/lib/utils";

const MODES: { id: AppMode; title: string; body: string; icon: typeof Target }[] = [
  { id: "beginner", title: "Beginner", body: "Today leads with the Beginner Path. Handles are optional.", icon: GraduationCap },
  { id: "smart", title: "Smart", body: "Today leads with your quests, today's mix and your Codeforces rating.", icon: Target },
];

/** Mode (Beginner or Smart) and the lesson video language. Both apply right away. */
export function ModeSection({ prefs }: { prefs: AppPrefs }) {
  const update = useUpdatePrefs();
  const navigate = useNavigate();
  const cf = useHandles().data?.codeforces.trim() ?? "";
  return (
    <section aria-labelledby="mode-title" className="glass-card p-6">
      <h2 id="mode-title" className="font-display text-headline font-semibold text-ink">
        Mode
      </h2>
      <p className="mt-1 max-w-[56ch] text-body text-ink-muted">What Today and Practice lead with. Your data, sheets and progress stay the same either way.</p>
      <div role="radiogroup" aria-labelledby="mode-title" className="mt-5 grid grid-cols-2 gap-4">
        {MODES.map((m) => {
          const on = prefs.mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={update.isPending}
              onClick={() => !on && update.mutate({ mode: m.id }, { onSuccess: () => navigate("/settings", { replace: true }) })}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-md border p-4 text-left transition-colors duration-[var(--dur-fast)]",
                on ? "border-accent bg-accent-soft" : "border-glass-border bg-abyss-sunken hover:border-glass-border-strong",
              )}
            >
              <m.icon aria-hidden className={cn("size-5", on ? "text-accent" : "text-ink-muted")} strokeWidth={1.8} />
              <span className="text-title font-semibold text-ink">{m.title}</span>
              <span className="text-body-sm text-ink-muted">{m.body}</span>
            </button>
          );
        })}
      </div>
      {prefs.mode === "smart" && !cf && (
        <p className="mt-3 text-body-sm text-warning">Smart mode is built around your Codeforces rating: add your Codeforces handle above.</p>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-glass-border pt-5">
        <div className="flex flex-col gap-0.5">
          <span className="text-body font-medium text-ink">Lesson video language</span>
          <span className="text-body-sm text-ink-faint">For Beginner Path lessons and topic videos. Videos play inside the app.</span>
        </div>
        <LangToggle />
      </div>
    </section>
  );
}
