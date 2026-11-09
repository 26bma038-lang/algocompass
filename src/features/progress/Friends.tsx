import { useId, useState, type FormEvent } from "react";
import { AlertCircle, Users, X } from "lucide-react";
import { CardHeader } from "@/components/CardHeader";
import { Term } from "@/components/Term";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAddFriend, useFriends, useRemoveFriend } from "@/data/friends";
import type { FriendRow } from "@/data/repo";
import { weekSolvesWords, type PersonStats } from "@/engine/friends";
import { cn } from "@/lib/utils";

const dash = <span className="text-ink-faint">–</span>;
const when = (t: number) => new Date(t * 1000).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function StatCells({ s }: { s: PersonStats | null }) {
  const week = s ? weekSolvesWords(s) : null;
  return (
    <>
      <td className="numeric py-3 pl-4 text-right whitespace-nowrap">
        {s?.cf ? (
          <span className="flex flex-col items-end">
            <span className="font-display text-title font-semibold text-ink">{s.cf.rating ?? <span className="text-body-sm font-normal text-ink-muted">Unrated</span>}</span>
            {s.cf.maxRating !== null && s.cf.maxRating !== s.cf.rating && <span className="text-label text-ink-muted">max {s.cf.maxRating}</span>}
          </span>
        ) : (
          dash
        )}
      </td>
      <td className="numeric py-3 pl-4 text-right text-body text-ink">
        {week ? (
          <span title={week.plus ? "The sites only show part of the latest history, so there may be more." : undefined}>
            {week.total}
            {week.plus && "+"}
          </span>
        ) : (
          dash
        )}
      </td>
      <td className="numeric py-3 pl-4 text-right text-body text-ink">
        {s ? (
          <>
            {s.streak} {s.streak === 1 ? "day" : "days"}
          </>
        ) : (
          dash
        )}
      </td>
      <td className="numeric py-3 pl-4 text-right text-body text-ink">{s?.lc ? s.lc.solved : dash}</td>
    </>
  );
}

function FriendRowView({ f }: { f: FriendRow }) {
  const remove = useRemoveFriend();
  const name = f.cfHandle ?? f.lcHandle ?? "Friend";
  return (
    <tr className="border-t border-glass-border align-top">
      <td className="py-3 pr-4">
        <span className="flex flex-col gap-0.5">
          <span className="text-body font-medium text-ink">{name}</span>
          <span className="text-label text-ink-muted">
            {[f.cfHandle && `Codeforces ${f.cfHandle}`, f.lcHandle && `LeetCode ${f.lcHandle}`].filter(Boolean).join(" · ")}
          </span>
          {!f.stats && !f.error && <span className="text-label text-ink-muted">Loads with the next update.</span>}
          {f.error && (
            <span className="flex items-start gap-1 text-label text-warning">
              <AlertCircle aria-hidden className="mt-px size-3 shrink-0" strokeWidth={2} />
              <span>
                Couldn't update just now{f.fetchedAt ? `; showing ${when(f.fetchedAt)}` : ""}. {f.error}
              </span>
            </span>
          )}
        </span>
      </td>
      <StatCells s={f.stats} />
      <td className="py-3 pl-3 text-right">
        <button
          type="button"
          disabled={remove.isPending}
          onClick={() => remove.mutate(f.id)}
          aria-label={`Remove ${name} from your friends`}
          className="grid size-8 place-items-center rounded-sm text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover hover:text-ink"
        >
          <X aria-hidden className="size-4" />
        </button>
      </td>
    </tr>
  );
}

function AddFriend() {
  const add = useAddFriend();
  const cfId = useId();
  const lcId = useId();
  const [cf, setCf] = useState("");
  const [lc, setLc] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    add.mutate(
      { cf, lc },
      {
        onSuccess: () => {
          setCf("");
          setLc("");
        },
      },
    );
  };
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3 border-t border-glass-border pt-5">
      <span className="text-body font-medium text-ink">Add a friend</span>
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={cfId}>Codeforces handle</Label>
          <Input id={cfId} value={cf} onChange={(e) => setCf(e.target.value)} placeholder="Optional" autoComplete="off" spellCheck={false} className="w-[200px]" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={lcId}>LeetCode username</Label>
          <Input id={lcId} value={lc} onChange={(e) => setLc(e.target.value)} placeholder="Optional" autoComplete="off" spellCheck={false} className="w-[200px]" />
        </div>
        <Button type="submit" disabled={add.isPending || (!cf.trim() && !lc.trim())}>
          {add.isPending ? "Checking…" : "Add friend"}
        </Button>
      </div>
      {add.isError && (
        <p role="alert" className="flex items-start gap-1.5 text-body-sm text-danger">
          <AlertCircle aria-hidden className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
          {add.error instanceof Error ? add.error.message : String(add.error)}
        </p>
      )}
    </form>
  );
}

/** Progress → Friends: you and your friends side by side. Public profiles only, kept on this computer. */
export function FriendsList() {
  const { data, isLoading } = useFriends();
  if (isLoading || !data) return <p className="text-body-sm text-ink-muted">Loading friends…</p>;
  const { you, youHandles, friends } = data;
  return (
    <section aria-labelledby="friends-title" className="glass-card flex flex-col gap-5 p-6">
      <CardHeader
        id="friends-title"
        title="Friends"
        description="Add friends by their Codeforces handle or LeetCode username. Only their public profiles are read, and the list stays on this computer. It refreshes with every update."
        pill={friends.length > 0 ? `${friends.length} ${friends.length === 1 ? "friend" : "friends"}` : undefined}
      />
      {friends.length === 0 ? (
        <div className="flex items-center gap-3 rounded-sm border border-dashed border-glass-border-strong p-4 text-body-sm text-ink-muted">
          <Users aria-hidden className="size-5 shrink-0" />
          No friends added yet. Add one below to see your <Term id="rating">ratings</Term>, solves this week and streaks side by side.
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="text-label text-ink-muted">
              <th className="pb-2 font-medium">Person</th>
              <th className="pb-2 pl-4 text-right font-medium">
                Codeforces <Term id="rating">rating</Term>
              </th>
              <th className="pb-2 pl-4 text-right font-medium">Solved this week</th>
              <th className="pb-2 pl-4 text-right font-medium">
                <Term id="streak">Streak</Term>
              </th>
              <th className="pb-2 pl-4 text-right font-medium">LeetCode solved</th>
              <th className="pb-2 pl-3">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className={cn("border-t border-glass-border bg-accent-soft/40 align-top")}>
              <td className="py-3 pr-4 pl-3">
                <span className="flex flex-col gap-0.5">
                  <span className="text-body font-semibold text-ink">You</span>
                  <span className="text-label text-ink-muted">{[youHandles.cf && `Codeforces ${youHandles.cf}`, youHandles.lc && `LeetCode ${youHandles.lc}`].filter(Boolean).join(" · ") || "No handles yet"}</span>
                </span>
              </td>
              <StatCells s={you} />
              <td />
            </tr>
            {friends.map((f) => (
              <FriendRowView key={f.id} f={f} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-label text-ink-muted">
        Solved this week counts problems first solved since Monday. A "+" means the site only shows part of the latest history (LeetCode shows the 20 most recent solves), so there may be more.
      </p>
      <AddFriend />
    </section>
  );
}
