import { Eye } from "lucide-react";
import { exitPreview, PREVIEW } from "@/lib/sandbox";

/** While a preview profile runs (Debug → Preview): says so, and offers the way back. */
export function PreviewBanner() {
  if (!PREVIEW) return null;
  return (
    <div role="status" className="relative z-20 flex h-9 shrink-0 items-center justify-center gap-3 border-b border-glass-border-strong bg-accent-soft px-4 text-body-sm text-ink">
      <Eye aria-hidden className="size-4 text-accent" strokeWidth={1.8} />
      <span>
        {PREVIEW === "beginner" ? "Preview: a fresh beginner profile." : "Preview: first launch."} Your real data and settings aren't touched.
      </span>
      <button type="button" onClick={exitPreview} className="rounded-xs font-semibold underline decoration-accent underline-offset-4 hover:text-accent">
        Exit preview
      </button>
    </div>
  );
}
