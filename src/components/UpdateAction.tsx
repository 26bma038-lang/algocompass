import { RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useHandles } from "@/data/settings";
import { useSyncStore } from "@/data/syncStore";
import { LABELS } from "@/lib/glossary";

/** True when the handles have loaded and neither is set: an update can't fetch anything. */
export function useNoHandles() {
  const handles = useHandles().data;
  return handles !== undefined && !handles.codeforces && !handles.leetcode;
}

/**
 * v1.8: the button an empty state ends in when what's missing comes from an update. Update now;
 * nothing while an update runs (the empty state says it's loading); and with no handle at all,
 * where to add one, since an update can't fetch anything without one. `primary` is the large
 * filled button for a card whose one action this is (Today's Do this next).
 */
export function UpdateAction({ primary = false }: { primary?: boolean }) {
  const syncing = useSyncStore((s) => s.syncing);
  const run = useSyncStore((s) => s.run);
  const noHandles = useNoHandles();
  const look = primary ? ({ size: "lg", className: "self-start" } as const) : ({ variant: "outline", size: "sm" } as const);
  if (noHandles) {
    return (
      <Button asChild {...look}>
        <Link to="/settings">Add a handle in Settings</Link>
      </Button>
    );
  }
  if (syncing) return null;
  return (
    <Button {...look} onClick={() => void run()}>
      <RefreshCw aria-hidden />
      {LABELS.updateNow}
    </Button>
  );
}

/** Is an update running right now (for "Loading…" titles next to UpdateAction)? */
export const useSyncing = () => useSyncStore((s) => s.syncing);
