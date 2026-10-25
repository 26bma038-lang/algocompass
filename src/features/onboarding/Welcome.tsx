import { useId, useState, type FormEvent } from "react";
import { AlertCircle, Check, Compass, GraduationCap, Loader2, Target } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkHandles, handlesStateKey, type HandleCheck } from "@/data/onboarding";
import { prefsKey, updatePrefs, type VideoLang } from "@/data/prefs";
import { writeHandles, writeOnboarded } from "@/data/settings";
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

type Mode = "beginner" | "smart";

/** A big radio card for the "New to DSA?" choice. */
function Choice({ checked, onSelect, icon: Icon, title, body }: { checked: boolean; onSelect: () => void; icon: typeof Compass; title: string; body: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        "flex flex-1 flex-col items-start gap-2 rounded-md border p-4 text-left transition-colors duration-[var(--dur-fast)]",
        checked ? "border-accent bg-accent-soft" : "border-glass-border bg-abyss-sunken hover:border-glass-border-strong",
      )}
    >
      <span className="flex w-full items-center justify-between gap-2">
        <Icon aria-hidden className={cn("size-5", checked ? "text-accent" : "text-ink-muted")} strokeWidth={1.8} />
        <span
          aria-hidden
          className={cn("grid size-4 place-items-center rounded-full border", checked ? "border-accent bg-accent" : "border-glass-border-strong")}
        >
          {checked && <span className="size-1.5 rounded-full bg-accent-ink" />}
        </span>
      </span>
      <span className="text-title font-semibold text-ink">{title}</span>
      <span className="text-body-sm text-ink-muted">{body}</span>
    </button>
  );
}

const LANGS: { id: VideoLang; label: string }[] = [
  { id: "en", label: "English" },
  { id: "hi", label: "Hindi" },
];

/**
 * First launch. One form: "New to DSA?" first, then the video language, then handles.
 * - Beginner: both handles are optional. "Start learning" checks any handle you typed, saves, and
 *   opens Today on the Beginner Path straight away; the first sync runs in the background.
 * - Smart (the app before v1.3): the Codeforces handle is required, and the first sync runs here
 *   with a step list.
 */
export function Welcome() {
  const client = useQueryClient();
  const [mode, setMode] = useState<Mode | null>(null);
  const [lang, setLang] = useState<VideoLang>("en");
  const [cfHandle, setCf] = useState("");
  const [lcHandle, setLc] = useState("");
  const [checks, setChecks] = useState<{ cf?: HandleCheck; lc?: HandleCheck }>({});
  const [formError, setFormError] = useState<{ cf?: string; lc?: string; mode?: string }>({});
  const [phase, setPhase] = useState<"form" | "checking" | "syncing" | "done">("form");
  const lastResult = useSyncStore((s) => s.lastResult);
  const beginner = mode === "beginner";

  const enter = () => void client.invalidateQueries({ queryKey: handlesStateKey });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const cf = cfHandle.trim();
    const lc = lcHandle.trim();
    const errors: typeof formError = {};
    if (!mode) errors.mode = "Pick one to continue. You can change it later in Settings.";
    if (mode === "smart" && !cf) errors.cf = "Enter your Codeforces handle. Smart mode is built around your rating.";
    else if (cf && !CF_HANDLE.test(cf)) errors.cf = "Use 3–24 letters, digits, dots, hyphens or underscores.";
    if (lc && !LC_HANDLE.test(lc)) errors.lc = "Use letters, digits, hyphens or underscores.";
    setFormError(errors);
    setChecks({});
    if (Object.keys(errors).length || !mode) return;

    let saved = { codeforces: "", leetcode: "" };
    if (cf || lc) {
      setPhase("checking");
      const result = await checkHandles({ codeforces: cf, leetcode: lc }, handleCheckers);
      setChecks(result);
      const bad = (result.cf.status !== "ok" && result.cf.status !== "skipped") || (result.lc.status !== "ok" && result.lc.status !== "skipped");
      if (bad) {
        setPhase("form");
        return;
      }
      // The platforms' own spelling of the handles.
      saved = { codeforces: result.cf.status === "ok" ? result.cf.handle : "", leetcode: result.lc.status === "ok" ? result.lc.handle : "" };
    }
    await writeHandles(saved);
    client.setQueryData(["settings", "handles"], saved);
    const prefs = await updatePrefs({ mode, videoLang: lang });
    client.setQueryData(prefsKey, prefs);
    await writeOnboarded();
    if (beginner) {
      // Straight in: the Beginner Path needs no data. The app shell starts the first sync on its own.
      enter();
      return;
    }
    setPhase("syncing");
    await useSyncStore.getState().run();
    setPhase("done");
  };

  const cfFailed = phase === "done" && lastResult !== null && !lastResult.cf.ok;
  const cfError = formError.cf ?? (checks.cf && "message" in checks.cf ? checks.cf.message : undefined);
  const lcError = formError.lc ?? (checks.lc && "message" in checks.lc ? checks.lc.message : undefined);

  return (
    <div className="mx-auto flex w-full max-w-[600px] flex-col gap-6 py-10">
      <div className="flex flex-col gap-3">
        <span className="grid size-12 place-items-center rounded-md bg-accent-soft">
          <Compass aria-hidden className="size-6 text-accent" strokeWidth={1.8} />
        </span>
        <h1 className="font-display text-display font-semibold text-ink">Welcome to AlgoCompass</h1>
        <p className="max-w-[54ch] text-body text-ink-muted">
          Learn data structures and algorithms step by step, follow a sheet like Striver's A2Z, and track your Codeforces and LeetCode progress.
          Everything stays on this computer.
        </p>
      </div>

      {phase === "form" || phase === "checking" ? (
        <form onSubmit={(e) => void submit(e)} noValidate className="glass-card flex flex-col gap-6 p-6" aria-busy={phase === "checking"}>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 font-display text-headline font-semibold text-ink">New to DSA?</legend>
            <div role="radiogroup" aria-label="New to DSA?" className="flex gap-3">
              <Choice
                checked={mode === "beginner"}
                onSelect={() => {
                  setMode("beginner");
                  setFormError((f) => ({ ...f, mode: undefined, cf: undefined }));
                }}
                icon={GraduationCap}
                title="Yes, I'm new"
                body="Start the Beginner Path: a short video, five lines to read and a few easy problems per step."
              />
              <Choice
                checked={mode === "smart"}
                onSelect={() => {
                  setMode("smart");
                  setFormError((f) => ({ ...f, mode: undefined }));
                }}
                icon={Target}
                title="No, I already practise"
                body="Track Codeforces and LeetCode, and get problems for your weakest topics every day."
              />
            </div>
            {formError.mode && (
              <p role="alert" className="flex items-start gap-1.5 text-body-sm text-danger">
                <AlertCircle aria-hidden className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
                {formError.mode}
              </p>
            )}
          </fieldset>

          {mode && (
            <>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-label text-ink-muted">Video language for lessons</legend>
                <div role="radiogroup" aria-label="Video language" className="flex h-10 items-center gap-1 self-start rounded-md border border-glass-border bg-glass p-1">
                  {LANGS.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      role="radio"
                      aria-checked={lang === l.id}
                      onClick={() => setLang(l.id)}
                      className={cn(
                        "flex h-8 items-center rounded-sm px-4 text-body-sm font-medium transition-colors duration-[var(--dur-fast)]",
                        lang === l.id ? "bg-accent-soft text-ink" : "text-ink-muted hover:bg-glass-hover hover:text-ink",
                      )}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="flex flex-col gap-5">
                {beginner && (
                  <p className="text-body-sm text-ink-muted">
                    Both are optional. Add your LeetCode username and the problems you solve there tick themselves; you can add them later in Settings.
                  </p>
                )}
                {beginner && (
                  <Field
                    label="LeetCode username (optional)"
                    dot="bg-platform-lc"
                    hint="Your solves on LeetCode tick the lesson problems for you."
                    value={lcHandle}
                    onChange={(v) => {
                      setLc(v);
                      setFormError((f) => ({ ...f, lc: undefined }));
                      setChecks((c) => ({ ...c, lc: undefined }));
                    }}
                    error={lcError}
                    ok={checks.lc?.status === "ok"}
                  />
                )}
                <Field
                  label={beginner ? "Codeforces handle (optional)" : "Codeforces handle"}
                  dot="bg-platform-cf"
                  hint={beginner ? "For later: contests and your rating." : "Required. Your rating, rounds and the problems you sharpen on."}
                  value={cfHandle}
                  onChange={(v) => {
                    setCf(v);
                    setFormError((f) => ({ ...f, cf: undefined }));
                    setChecks((c) => ({ ...c, cf: undefined }));
                  }}
                  error={cfError}
                  ok={checks.cf?.status === "ok"}
                />
                {!beginner && (
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
                )}
              </div>
            </>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={phase === "checking"}>
              {phase === "checking" ? (
                <>
                  <Loader2 aria-hidden className="animate-spin" />
                  Checking…
                </>
              ) : beginner ? (
                "Start learning"
              ) : (
                "Continue"
              )}
            </Button>
            <span className="text-body-sm text-ink-faint">
              {beginner ? "Takes you straight to Step 1." : mode === "smart" ? "We check that the usernames exist, then fetch your history." : "You can change this later in Settings."}
            </span>
          </div>
        </form>
      ) : (
        <section className="glass-card flex flex-col gap-4 p-6" aria-labelledby="first-sync-title">
          <div className="flex flex-col gap-1">
            <h2 id="first-sync-title" className="font-display text-headline font-semibold text-ink">
              {phase === "syncing" ? "Fetching your history…" : cfFailed ? "The first update didn't finish" : "All set"}
            </h2>
            <p className="text-body-sm text-ink-muted">
              {phase === "syncing"
                ? "About a minute the first time: Codeforces allows one request every two seconds, and the problemset is large."
                : cfFailed
                  ? `${lastResult?.cf.errors[0] ?? "Codeforces didn't answer."} Your handles are saved; try again, or continue and it retries on its own.`
                  : "Your stats are in. From now on AlgoCompass updates on its own every two hours."}
            </p>
          </div>
          <SyncProgress withLc={lcHandle.trim() !== ""} />
          {phase === "done" && (
            <div className="flex items-center gap-3">
              <Button onClick={enter}>Open Today</Button>
              {cfFailed && (
                <Button variant="outline" onClick={() => void useSyncStore.getState().run()}>
                  Try the update again
                </Button>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
