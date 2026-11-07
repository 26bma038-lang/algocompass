import type { CodeLang, Coded } from "@/engine/codeLang";
import { CODE_LANG_NAMES, videoCodeLabel } from "@/lib/glossary";
import { cn } from "@/lib/utils";

/**
 * What a video codes in (v1.5), on every video card: "Concept", "C++", "C++ · Python". Your own
 * language gets the accent's soft fill; the words always say it, so colour is never the only cue.
 */
export function CodeChip({ video, mine, className }: { video: Coded; mine?: CodeLang; className?: string }) {
  const label = [videoCodeLabel(video.codeLang), ...(video.alsoCodeLang ?? []).map((l) => CODE_LANG_NAMES[l])].join(" · ");
  const yours = !!mine && (video.codeLang === mine || (video.alsoCodeLang?.includes(mine) ?? false));
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-full border px-2 text-label leading-none font-medium whitespace-nowrap",
        yours ? "border-transparent bg-accent-soft text-ink" : "border-glass-border text-ink-muted",
        className,
      )}
    >
      <span className="sr-only">{video.codeLang === "concept" ? "Explains the idea, no one language: " : "Codes in: "}</span>
      {label}
    </span>
  );
}
