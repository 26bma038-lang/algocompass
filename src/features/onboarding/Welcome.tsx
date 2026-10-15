import { useId, useState, type FormEvent } from "react";
import { AlertCircle, Check, Compass, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkHandles, handlesStateKey, type HandleCheck } from "@/data/onboarding";
import { writeHandles } from "@/data/settings";
import { handleCheckers, useSyncStore } from "@/data/syncStore";
import { cn } from "@/lib/utils";

// Same rules as Settings: Codeforces handles are 3–24 of letters, digits, _ . -; LeetCode letters, digits, _ -.
const CF_HANDLE = /^[A-Za-z0-9_.-]{3,24}$/;
const LC_HANDLE = /^[A-Za-z0-9_-]{1,40}$/;

/** What the first sync is doing, in words (sync step kinds → labels). */
const STEP_LABEL: Record<string, string> = {
  "cf:user": "Codeforces profile",
  "cf:rating": "Rating history",
  "cf:submissions": "Your submissions",
  "cf:problemset": "Codeforces problemset (about 11,000 problems)",
  "cf:contests": "Contest calendar",
  "cf:results": "Your past rounds",
  "lc:profile": "LeetCode profile",
  "lc:tags": "LeetCode topics",
  "lc:calendar": "LeetCode activity",
  "lc:recent": "Recent LeetCode solves",
  "lc:problems": "LeetCode problem details",
  "lc:contests": "LeetCode contests",
};
const CF_STEPS = ["cf:user", "cf:rating", "cf:submissions", "cf:problemset", "cf:contests", "cf:results"];
const LC_STEPS = ["lc:profile", "lc:tags", "lc:calendar", "lc:recent", "lc:problems", "lc:contests"];

function Field({
  label,
  dot,
  hint,
  value,
  onChange,
  error,
  ok,
  autoFocus,
}: {
  label: string;
  dot: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  ok?: boolean;
  autoFocus?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5">
        <span aria-hidden className={cn("size-1.5 rounded-full", dot)} />
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-help`}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? (
        <p id={`${id}-help`} role="alert" className="flex items-start gap-1.5 text-body-sm text-danger">
          <AlertCircle aria-hidden className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
          {error}
        </p>
      ) : ok ? (
        <p id={`${id}-help`} className="flex items-center gap-1.5 text-body-sm text-ink-muted">
          <Check aria-hidden className="size-3.5 text-success" strokeWidth={2.4} />
          Found
        </p>
      ) : (
        <p id={`${id}-help`} className="text-body-sm text-ink-faint">
          {hint}
        </p>
      )}
    </div>
  );
}

function SyncProgress({ withLc }: { withLc: boolean }) {
  const progress = useSyncStore((s) => s.progress);
  const syncing = useSyncStore((s) => s.syncing);
  const steps = [...CF_STEPS, ...(withLc ? LC_STEPS : [])];
  const done = new Map(progress.map((p) => [p.kind, p.status]));
  const next = steps.find((k) => !done.has(k));
  return (
    <ul aria-live="polite" className="flex flex-col gap-1.5">
      {steps.map((k) => {
        const status = done.get(k);
        const running = syncing && k === next;
        return (
          <li key={k} className="flex items-center gap-2 text-body-sm">
            {status === "ok" || status === "skipped" ? (
              <Check aria-hidden className="size-4 text-success" strokeWidth={2.4} />
            ) : status === "error" ? (
              <AlertCircle aria-hidden className="size-4 text-danger" strokeWidth={2} />
            ) : running ? (
              <Loader2 aria-hidden className="size-4 animate-spin text-ink-muted" />
            ) : (
              <span aria-hidden className="mx-1 size-2 rounded-full border border-glass-border-strong" />
            )}
            <span className={status ? "text-ink" : running ? "text-ink" : "text-ink-faint"}>{STEP_LABEL[k] ?? k}</span>
            {status === "error" && <span className="text-danger">failed</span>}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * First launch: no handles saved and nothing synced. Asks for the Codeforces handle (required)
 * and LeetCode username (optional), checks both against the platforms, then runs the first sync
 * with a step list. The rest of the app stays out of the way until there's real data to show.
 */
export function Welcome() {
  const client = useQueryClient();
  const [cfHandle, setCf] = useState("");
  const [lcHandle, setLc] = useState("");
  const [checks, setChecks] = useState<{ cf?: HandleCheck; lc?: HandleCheck }>({});
  const [formError, setFormError] = useState<{ cf?: string; lc?: string }>({});
  const [phase, setPhase] = useState<"form" | "checking" | "syncing" | "done">("form");
  const lastResult = useSyncStore((s) => s.lastResult);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const cf = cfHandle.trim();
    const lc = lcHandle.trim();
    const errors: typeof formError = {};
    if (!cf) errors.cf = "Enter your Codeforces handle. It's the one thing AlgoCompass needs.";
    else if (!CF_HANDLE.test(cf)) errors.cf = "Use 3–24 letters, digits, dots, hyphens or underscores.";
    if (lc && !LC_HANDLE.test(lc)) errors.lc = "Use letters, digits, hyphens or underscores.";
    setFormError(errors);
    setChecks({});
    if (Object.keys(errors).length) return;

    setPhase("checking");
    const result = await checkHandles({ codeforces: cf, leetcode: lc }, handleCheckers);
    setChecks(result);
    const bad = result.cf.status !== "ok" || (result.lc.status !== "ok" && result.lc.status !== "skipped");
    if (bad) {
      setPhase("form");
      return;
    }
    // Save the platforms' own spelling of the handles, then run the first sync right here.
    const saved = {
      codeforces: result.cf.status === "ok" ? result.cf.handle : cf,
      leetcode: result.lc.status === "ok" ? result.lc.handle : "",
    };
    await writeHandles(saved);
    client.setQueryData(["settings", "handles"], saved);
    setPhase("syncing");
    await useSyncStore.getState().run();
    setPhase("done");
  };

  const enter = () => void client.invalidateQueries({ queryKey: handlesStateKey });
  const cfFailed = phase === "done" && lastResult !== null && !lastResult.cf.ok;
  const cfError = formError.cf ?? (checks.cf && "message" in checks.cf ? checks.cf.message : undefined);
  const lcError = formError.lc ?? (checks.lc && "message" in checks.lc ? checks.lc.message : undefined);

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6 py-10">
      <div className="flex flex-col gap-3">
        <span className="grid size-12 place-items-center rounded-md bg-accent-soft">
          <Compass aria-hidden className="size-6 text-accent" strokeWidth={1.8} />
        </span>
        <h1 className="font-display text-display font-semibold text-ink">Welcome to AlgoCompass</h1>
        <p className="max-w-[52ch] text-body text-ink-muted">
          It reads your public Codeforces and LeetCode profiles, finds your weak topics and tells you what to practice next. Everything stays on
          this computer.
        </p>
      </div>

      {phase === "form" || phase === "checking" ? (
        <form onSubmit={(e) => void submit(e)} noValidate className="glass-card flex flex-col gap-5 p-6" aria-busy={phase === "checking"}>
          <Field
            label="Codeforces handle"
            dot="bg-platform-cf"
            hint="Required. Your rating, rounds and the problems you sharpen on."
            value={cfHandle}
            onChange={(v) => {
              setCf(v);
              setFormError((f) => ({ ...f, cf: undefined }));
              setChecks((c) => ({ ...c, cf: undefined }));
            }}
            error={cfError}
            ok={checks.cf?.status === "ok"}
            autoFocus
          />
          <Field
            label="LeetCode username (optional)"
            dot="bg-platform-lc"
            hint="Where new topics are learned. Leave it empty to skip; you can add it later in Settings."
            value={lcHandle}
            onChange={(v) => {
              setLc(v);
              setFormError((f) => ({ ...f, lc: undefined }));
              setChecks((c) => ({ ...c, lc: undefined }));
            }}
            error={lcError}
            ok={checks.lc?.status === "ok"}
          />
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={phase === "checking"}>
              {phase === "checking" ? (
                <>
                  <Loader2 aria-hidden className="animate-spin" />
                  Checking handles…
                </>
              ) : (
                "Continue"
              )}
            </Button>
            <span className="text-body-sm text-ink-faint">We check that the handles exist before syncing.</span>
          </div>
        </form>
      ) : (
        <section className="glass-card flex flex-col gap-4 p-6" aria-labelledby="first-sync-title">
          <div className="flex flex-col gap-1">
            <h2 id="first-sync-title" className="font-display text-headline font-semibold text-ink">
              {phase === "syncing" ? "Fetching your history…" : cfFailed ? "The first sync didn't finish" : "All set"}
            </h2>
            <p className="text-body-sm text-ink-muted">
              {phase === "syncing"
                ? "About a minute the first time: Codeforces allows one request every two seconds, and the problemset is large."
                : cfFailed
                  ? `${lastResult?.cf.errors[0] ?? "Codeforces didn't answer."} Your handles are saved; try again, or continue and it retries on its own.`
                  : "Your stats are in. From now on AlgoCompass syncs on its own every two hours."}
            </p>
          </div>
          <SyncProgress withLc={lcHandle.trim() !== ""} />
          {phase === "done" && (
            <div className="flex items-center gap-3">
              <Button onClick={enter}>Open Home Base</Button>
              {cfFailed && (
                <Button variant="outline" onClick={() => void useSyncStore.getState().run()}>
                  Try the sync again
                </Button>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
