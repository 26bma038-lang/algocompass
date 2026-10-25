import { useId, useState, type FormEvent } from "react";
import { AlertCircle, Check, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkHandles, handlesStateKey } from "@/data/onboarding";
import { usePrefs } from "@/data/prefs";
import { useHandles, useSaveHandles } from "@/data/settings";
import { handleCheckers, useSyncStore } from "@/data/syncStore";
import { LC_HANDLE } from "@/features/onboarding/flow";
import { LABELS } from "@/lib/glossary";
import { openExternal } from "@/lib/openExternal";
import { connectState, LEETCODE_SIGNUP_URL, SOLVE_GUIDE_STEPS } from "./solveGuide";

/** The step-by-step "How to solve on LeetCode" panel, inline in the lesson's Solve part. */
export function SolveGuide({ onDone, doneLabel }: { onDone: () => void; doneLabel: string }) {
  return (
    <section aria-labelledby="solve-guide-title" className="flex flex-col gap-4 rounded-md border border-accent-line bg-accent-soft p-5">
      <div className="flex flex-col gap-1">
        <h3 id="solve-guide-title" className="text-title font-semibold text-ink">
          {LABELS.howToSolve}
        </h3>
        <p className="text-body-sm text-ink-muted">First time? It takes a minute. The problems open on leetcode.com in your browser.</p>
      </div>
      <ol className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
        {SOLVE_GUIDE_STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <span aria-hidden className="numeric grid size-6 shrink-0 place-items-center rounded-full bg-accent text-label font-semibold text-accent-ink">
              {i + 1}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-body font-semibold text-ink">{s.title}</span>
              <span className="text-body-sm text-ink-muted">{s.body}</span>
              {i === 0 && (
                <button
                  type="button"
                  onClick={() => openExternal(LEETCODE_SIGNUP_URL)}
                  className="inline-flex items-center gap-1 self-start rounded-xs text-body-sm font-medium text-ink underline decoration-glass-border-strong underline-offset-4"
                >
                  Sign up on LeetCode
                  <ExternalLink aria-hidden className="size-3" />
                  <span className="sr-only">(opens in your browser)</span>
                </button>
              )}
            </span>
          </li>
        ))}
      </ol>
      <Button variant="outline" size="sm" className="self-start" onClick={onDone}>
        {doneLabel}
      </Button>
    </section>
  );
}

/**
 * "Connect LeetCode to tick automatically" (v1.4): a username and Update, right where the problems
 * are. Once connected, a beginner (who has no Update in the top bar) gets the Update button here.
 */
export function ConnectLeetCode() {
  const handles = useHandles().data;
  const mode = usePrefs().data?.mode ?? "smart";
  const save = useSaveHandles();
  const client = useQueryClient();
  const syncing = useSyncStore((s) => s.syncing);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const id = useId();
  if (!handles) return null;
  const state = connectState({ leetcode: handles.leetcode, mode });
  if (state === "hidden") return null;

  const update = () => void useSyncStore.getState().run();

  if (state === "connected") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-abyss-sunken px-4 py-3">
        <p className="flex items-center gap-2 text-body-sm text-ink-muted">
          <Check aria-hidden className="size-4 shrink-0 text-success" strokeWidth={2.4} />
          <span>
            Problems you solve as <span className="font-semibold text-ink">{handles.leetcode}</span> on LeetCode tick themselves when you update.
          </span>
        </p>
        <Button variant="outline" size="sm" onClick={update} disabled={syncing} aria-busy={syncing}>
          <RefreshCw aria-hidden className={syncing ? "animate-spin" : undefined} />
          {syncing ? LABELS.updating : LABELS.update}
        </Button>
        <span className="sr-only" aria-live="polite">
          {syncing ? LABELS.updating : ""}
        </span>
      </div>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const lc = name.trim();
    if (!LC_HANDLE.test(lc)) {
      setError(lc ? "Use letters, digits, hyphens or underscores." : "Type your LeetCode username first.");
      return;
    }
    setChecking(true);
    const result = await checkHandles({ codeforces: "", leetcode: lc }, handleCheckers);
    setChecking(false);
    if (result.lc.status !== "ok") {
      setError("message" in result.lc ? result.lc.message : "Couldn't check that username.");
      return;
    }
    save.mutate(
      { codeforces: handles.codeforces, leetcode: result.lc.handle },
      {
        onSuccess: () => {
          void client.invalidateQueries({ queryKey: handlesStateKey });
          update();
        },
      },
    );
  };

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-2 rounded-md bg-abyss-sunken px-4 py-3" aria-busy={checking}>
      <label htmlFor={id} className="flex items-center gap-1.5 text-body-sm font-semibold text-ink">
        <span aria-hidden className="size-1.5 rounded-full bg-platform-lc" />
        {LABELS.connectLc}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          id={id}
          value={name}
          placeholder="Your LeetCode username"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-help`}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          className="h-9 w-[240px]"
        />
        <Button type="submit" variant="outline" size="sm" disabled={checking || save.isPending}>
          {checking ? <Loader2 aria-hidden className="animate-spin" /> : <RefreshCw aria-hidden />}
          {checking ? "Checking…" : LABELS.update}
        </Button>
      </div>
      {error ? (
        <p id={`${id}-help`} role="alert" className="flex items-start gap-1.5 text-body-sm text-danger">
          <AlertCircle aria-hidden className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
          {error}
        </p>
      ) : (
        <p id={`${id}-help`} className="text-body-sm text-ink-muted">
          Optional. It's the name in your profile link, leetcode.com/u/<span className="italic">username</span>. Without it, tick each problem by hand.
        </p>
      )}
    </form>
  );
}
