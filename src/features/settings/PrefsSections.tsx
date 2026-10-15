import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { AlertCircle, Check } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePrefs, useSavePrefs, type AppPrefs, type NotifyPrefs } from "@/data/prefs";
import type { WeeklyGoals } from "@/engine/goals";
import { autostartEnabled, setAutostart } from "@/lib/desktop";

const GOAL_MAX = 200;

function GoalField({ label, dot, value, error, onChange }: { label: string; dot?: string; value: string; error?: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5">
        {dot && <span aria-hidden className={`size-1.5 rounded-full ${dot}`} />}
        {label}
      </Label>
      <Input
        id={id}
        inputMode="numeric"
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="numeric"
      />
      {error && (
        <p id={`${id}-err`} className="flex items-center gap-1.5 text-body-sm text-danger">
          <AlertCircle aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
          {error}
        </p>
      )}
    </div>
  );
}

type GoalDraft = Record<keyof WeeklyGoals, string>;
const toDraft = (g: WeeklyGoals): GoalDraft => ({ cfProblems: String(g.cfProblems), lcProblems: String(g.lcProblems), contests: String(g.contests) });

function GoalsSection({ prefs }: { prefs: AppPrefs }) {
  const save = useSavePrefs();
  const [draft, setDraft] = useState<GoalDraft>(() => toDraft(prefs.goals));
  const [errors, setErrors] = useState<Partial<Record<keyof WeeklyGoals, string>>>({});
  const [saved, setSaved] = useState(false);
  const dirty = (Object.keys(draft) as (keyof WeeklyGoals)[]).some((k) => draft[k].trim() !== String(prefs.goals[k]));

  const set = (k: keyof WeeklyGoals) => (v: string) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
    setSaved(false);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const found: typeof errors = {};
    const goals = {} as WeeklyGoals;
    for (const k of Object.keys(draft) as (keyof WeeklyGoals)[]) {
      const n = Number(draft[k].trim());
      if (!/^\d+$/.test(draft[k].trim()) || n > GOAL_MAX) found[k] = `Use a whole number from 0 to ${GOAL_MAX}.`;
      else goals[k] = n;
    }
    setErrors(found);
    if (Object.keys(found).length) return;
    save.mutate({ ...prefs, goals }, { onSuccess: () => setSaved(true) });
  };

  return (
    <section aria-labelledby="goals-title" className="glass-card p-6">
      <h2 id="goals-title" className="text-title font-semibold text-ink">
        Weekly goals
      </h2>
      <p className="mt-1 max-w-[56ch] text-body text-ink-muted">
        Progress rings on the Quests screen. Weeks run Monday to Sunday. A problem counts in the week you first solve it.
      </p>
      <form
        onSubmit={onSubmit}
        onKeyDown={(e) => {
          if (e.key === "Escape" && dirty) {
            setDraft(toDraft(prefs.goals));
            setErrors({});
          }
        }}
        noValidate
        className="mt-6 flex flex-col gap-5"
      >
        <div className="grid grid-cols-3 gap-4">
          <GoalField label="Codeforces problems" dot="bg-platform-cf" value={draft.cfProblems} error={errors.cfProblems} onChange={set("cfProblems")} />
          <GoalField label="LeetCode problems" dot="bg-platform-lc" value={draft.lcProblems} error={errors.lcProblems} onChange={set("lcProblems")} />
          <GoalField label="Contests" value={draft.contests} error={errors.contests} onChange={set("contests")} />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!dirty || save.isPending}>
            {save.isPending ? "Saving…" : "Save goals"}
          </Button>
          <span role="status" className="flex items-center gap-1.5 text-body-sm">
            {saved && !dirty && (
              <>
                <Check aria-hidden className="size-3.5 text-success" strokeWidth={2.4} />
                <span className="text-ink-muted">Goals saved</span>
              </>
            )}
          </span>
        </div>
      </form>
    </section>
  );
}

function ToggleRow({ title, hint, checked, onChange, disabled, children }: { title: string; hint: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; children?: ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-3 border-t border-glass-border py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-6">
        <div className="flex flex-col gap-0.5">
          <Label htmlFor={id} className="text-body font-medium text-ink">
            {title}
          </Label>
          <p id={`${id}-hint`} className="text-body-sm text-ink-faint">
            {hint}
          </p>
        </div>
        <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} aria-describedby={`${id}-hint`} className="mt-0.5" />
      </div>
      {children}
    </div>
  );
}

function NotificationsSection({ prefs }: { prefs: AppPrefs }) {
  const save = useSavePrefs();
  const timeId = useId();
  const [time, setTime] = useState(prefs.notify.streakTime);
  useEffect(() => setTime(prefs.notify.streakTime), [prefs.notify.streakTime]);
  const set = (patch: Partial<NotifyPrefs>) => save.mutate({ ...prefs, notify: { ...prefs.notify, ...patch } });

  return (
    <section aria-labelledby="notify-title" className="glass-card p-6">
      <h2 id="notify-title" className="text-title font-semibold text-ink">
        Notifications
      </h2>
      <p className="mt-1 max-w-[56ch] text-body text-ink-muted">Windows notifications. They still arrive while AlgoCompass is hidden in the tray.</p>
      <div className="mt-6 flex flex-col">
        <ToggleRow
          title="Contest reminders"
          hint={'1 hour and 10 minutes before contests you marked "I\'ll attend".'}
          checked={prefs.notify.contests}
          onChange={(v) => set({ contests: v })}
        />
        <ToggleRow
          title="Streak at risk"
          hint="An evening nudge when you haven't solved anything today. Only while a streak is running."
          checked={prefs.notify.streak}
          onChange={(v) => set({ streak: v })}
        >
          <div className="flex items-center gap-3">
            <Label htmlFor={timeId} className="text-body-sm text-ink-muted">
              Remind me at
            </Label>
            <Input
              id={timeId}
              type="time"
              value={time}
              disabled={!prefs.notify.streak}
              onChange={(e) => {
                setTime(e.target.value);
                if (/^\d{2}:\d{2}$/.test(e.target.value)) set({ streakTime: e.target.value });
              }}
              className="numeric w-[132px] [color-scheme:dark] disabled:opacity-45"
            />
          </div>
        </ToggleRow>
        <ToggleRow
          title="Quest complete"
          hint="When a sync finds you finished one of today's quests."
          checked={prefs.notify.quests}
          onChange={(v) => set({ quests: v })}
        />
      </div>
    </section>
  );
}

function StartupSection() {
  const client = useQueryClient();
  const state = useQuery({ queryKey: ["settings", "autostart"], queryFn: autostartEnabled });
  const toggle = useMutation({
    mutationFn: setAutostart,
    onSuccess: () => client.invalidateQueries({ queryKey: ["settings", "autostart"] }),
  });
  const unavailable = state.data === null;
  return (
    <section aria-labelledby="startup-title" className="glass-card p-6">
      <h2 id="startup-title" className="text-title font-semibold text-ink">
        Startup
      </h2>
      <div className="mt-6 flex flex-col">
        <ToggleRow
          title="Launch on Windows startup"
          hint={unavailable ? "Only available in the desktop app." : "Starts minimized to the tray, so reminders and syncs keep running."}
          checked={state.data === true}
          disabled={unavailable || state.isLoading || toggle.isPending}
          onChange={(v) => toggle.mutate(v)}
        />
        {toggle.isError && (
          <p className="flex items-center gap-1.5 pt-3 text-body-sm text-danger">
            <AlertCircle aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
            Couldn't change the startup setting. {toggle.error instanceof Error ? toggle.error.message : String(toggle.error)}
          </p>
        )}
      </div>
    </section>
  );
}

export function PrefsSections() {
  const { data: prefs } = usePrefs();
  if (!prefs) return <p className="text-body-sm text-ink-muted">Loading settings…</p>;
  return (
    <>
      <GoalsSection prefs={prefs} />
      <NotificationsSection prefs={prefs} />
      <StartupSection />
    </>
  );
}
