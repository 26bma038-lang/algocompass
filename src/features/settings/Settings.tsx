import { useEffect, useId, useState, type FormEvent } from "react";
import { AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHandles, useSaveHandles, type Handles } from "@/data/settings";
import { getRepo, useSyncStore } from "@/data/syncStore";
import { PrefsSections } from "./PrefsSections";
import { usePrefs } from "@/data/prefs";

// Codeforces handles: 3–24 chars of letters, digits, underscore, dot, hyphen.
const CF_HANDLE = /^[A-Za-z0-9_.-]{3,24}$/;
// LeetCode usernames: letters, digits, underscore, hyphen.
const LC_HANDLE = /^[A-Za-z0-9_-]{1,40}$/;

function validate(h: Handles, cfRequired: boolean): Partial<Record<keyof Handles, string>> {
  const errors: Partial<Record<keyof Handles, string>> = {};
  const cf = h.codeforces.trim();
  const lc = h.leetcode.trim();
  // Codeforces is required in smart mode and optional in Beginner mode (v1.3).
  if (!cf && cfRequired) errors.codeforces = "Enter your Codeforces handle.";
  else if (cf && !CF_HANDLE.test(cf)) errors.codeforces = "Use 3–24 letters, digits, dots, hyphens or underscores.";
  // LeetCode is optional: empty means "don't track LeetCode".
  if (lc && !LC_HANDLE.test(lc)) errors.leetcode = "Use letters, digits, hyphens or underscores.";
  return errors;
}

function HandleField({
  label,
  hint,
  dotClass,
  value,
  error,
  onChange,
}: {
  label: string;
  hint: string;
  dotClass: string;
  value: string;
  error: string | undefined;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5">
        <span aria-hidden className={`size-1.5 rounded-full ${dotClass}`} />
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-help`}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? (
        <p id={`${id}-help`} className="flex items-center gap-1.5 text-body-sm text-danger">
          <AlertCircle aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
          {error}
        </p>
      ) : (
        <p id={`${id}-help`} className="text-body-sm text-ink-faint">
          {hint}
        </p>
      )}
    </div>
  );
}

export function Settings() {
  const { data: saved, isLoading } = useHandles();
  const beginner = usePrefs().data?.mode === "beginner";
  const save = useSaveHandles();
  const [draft, setDraft] = useState<Handles | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Handles, string>>>({});
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (saved && !draft) setDraft(saved);
  }, [saved, draft]);

  const dirty =
    !!draft && !!saved && (draft.codeforces.trim() !== saved.codeforces || draft.leetcode.trim() !== saved.leetcode);

  const update = (key: keyof Handles) => (value: string) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setJustSaved(false);
  };

  const discard = () => {
    if (saved) setDraft(saved);
    setErrors({});
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    const found = validate(draft, !beginner);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    save.mutate(draft, {
      onSuccess: async (clean) => {
        setDraft(clean);
        setJustSaved(true);
        // LeetCode removed: drop its cached data now (sync never clears on an empty username).
        if (saved?.leetcode && !clean.leetcode) await (await getRepo()).clearPlatform("lc");
        // Codeforces removed (only possible in Beginner mode): same, or the cached profile would be adopted again.
        if (saved?.codeforces && !clean.codeforces) await (await getRepo()).clearPlatform("cf");
        // Handles changed: re-sync (the sync clears the old handle's history first).
        void useSyncStore.getState().run();
      },
    });
  };

  return (
    // One column at the minimum window; two at large ones (handles and goals, then notifications and startup).
    <div className="grid max-w-[640px] grid-cols-1 items-start gap-6 2xl:max-w-[1312px] 2xl:grid-cols-2">
      <section aria-labelledby="handles-title" className="glass-card p-6">
        <h2 id="handles-title" className="font-display text-headline font-semibold text-ink">
          Handles
        </h2>
        <p className="mt-1 max-w-[56ch] text-body text-ink-muted">
          AlgoCompass reads your public profiles with these. Changing a handle re-syncs from scratch.
        </p>

        {isLoading || !draft ? (
          <p className="mt-6 text-body-sm text-ink-muted">Loading saved handles…</p>
        ) : (
          <form
            onSubmit={onSubmit}
            onKeyDown={(e) => {
              if (e.key === "Escape" && dirty) discard();
            }}
            noValidate
            className="mt-6 flex flex-col gap-5"
          >
            <div className="grid grid-cols-2 gap-4">
              <HandleField
                label={beginner ? "Codeforces handle (optional)" : "Codeforces handle"}
                hint="Used for rating, contests and sharpening practice."
                dotClass="bg-platform-cf"
                value={draft.codeforces}
                error={errors.codeforces}
                onChange={update("codeforces")}
              />
              <HandleField
                label="LeetCode username (optional)"
                hint="Used for learning new topics. Leave empty to skip LeetCode."
                dotClass="bg-platform-lc"
                value={draft.leetcode}
                error={errors.leetcode}
                onChange={update("leetcode")}
              />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={!dirty || save.isPending}>
                {save.isPending ? "Saving…" : "Save handles"}
              </Button>
              {dirty && (
                <Button type="button" variant="ghost" onClick={discard}>
                  Discard changes
                </Button>
              )}
              <span role="status" className="flex items-center gap-1.5 text-body-sm">
                {justSaved && !dirty && (
                  <>
                    <Check aria-hidden className="size-3.5 text-success" strokeWidth={2.4} />
                    <span className="text-ink-muted">Handles saved</span>
                  </>
                )}
                {save.isError && (
                  <>
                    <AlertCircle aria-hidden className="size-3.5 text-danger" strokeWidth={2} />
                    <span className="text-danger">Couldn't save handles. Check disk access and try again.</span>
                  </>
                )}
              </span>
            </div>
          </form>
        )}
      </section>
      <PrefsSections />
    </div>
  );
}
