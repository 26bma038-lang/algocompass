import { useEffect } from "react";
import { Download } from "lucide-react";
import { maybeCheckDaily, restartToUpdate, useUpdaterStore } from "@/lib/updater";

/** Runs the quiet daily check, and shows "Update ready, restart" once a new version has downloaded. */
export function UpdateBanner() {
  const status = useUpdaterStore((s) => s.status);
  useEffect(() => {
    const first = window.setTimeout(() => void maybeCheckDaily(), 20_000);
    const again = window.setInterval(() => void maybeCheckDaily(), 6 * 60 * 60 * 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(again);
    };
  }, []);
  if (status.kind !== "ready") return null;
  return (
    <div role="status" className="relative z-20 flex h-9 shrink-0 items-center justify-center gap-3 border-b border-glass-border-strong bg-accent-soft px-4 text-body-sm text-ink">
      <Download aria-hidden className="size-4 text-accent" strokeWidth={1.8} />
      <span>AlgoCompass {status.version} is ready.</span>
      <button type="button" onClick={() => void restartToUpdate()} className="rounded-xs font-semibold underline decoration-accent underline-offset-4 hover:text-accent">
        Restart to update
      </button>
    </div>
  );
}
