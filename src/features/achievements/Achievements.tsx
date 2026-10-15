import { Check, Trophy } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { NumberTicker } from "@/components/ui/number-ticker";
import { useProgression, type AchievementView } from "@/data/progression";
import { CATEGORIES } from "@/engine/achievements";
import { xpForLevel } from "@/engine/xp";
import { cn } from "@/lib/utils";
import { AchievementBadge } from "./AchievementBadge";

const plain = (n: number) => String(Math.round(n));
const date = (t: number) => new Date(t * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

function Meter({ value, target }: { value: number; target: number }) {
  return (
    <span aria-hidden className="relative block h-1 overflow-hidden rounded-full bg-glass-border-strong">
      <span className="absolute inset-0 origin-left rounded-full bg-ink-faint" style={{ transform: `scaleX(${target > 0 ? Math.min(1, value / target) : 0})` }} />
    </span>
  );
}

/** One achievement. Earned: lit badge, title and the date. Locked: a silhouette with the hint and progress. */
function AchievementCard({ a }: { a: AchievementView }) {
  const p = a.progress;
  const showMeter = !a.unlocked && p !== null && p.target > 1 && p.value > 0;
  return (
    <li
      className={cn(
        "flex gap-3 rounded-md border p-4",
        a.unlocked ? "border-glass-border-strong bg-glass" : "border-dashed border-glass-border bg-abyss-sunken/60",
      )}
    >
      <AchievementBadge icon={a.def.icon} unlocked={a.unlocked} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={cn("text-body font-semibold", a.unlocked ? "text-ink" : "text-ink-muted")}>{a.def.title}</span>
        <span className="text-body-sm text-ink-muted">{a.def.hint}</span>
        {a.unlocked ? (
          <span className="flex items-center gap-1 text-label text-ink">
            {/* At Newbie the accent is gray: the check and the word carry "earned", never the color. */}
            <Check aria-hidden className="size-3.5 shrink-0 text-success" strokeWidth={2.4} />
            {a.at !== null ? `Earned ${date(a.at)}` : "Earned before tracking"}
            <span className="sr-only">. Unlocked.</span>
          </span>
        ) : showMeter ? (
          <span className="mt-1 flex flex-col gap-1">
            <Meter value={p.value} target={p.target} />
            <span className="numeric text-label text-ink-muted">
              {p.label} {p.value.toLocaleString()}/{p.target.toLocaleString()}
            </span>
          </span>
        ) : p && p.label.endsWith("left") ? (
          <span className="text-label text-ink-muted">{p.label}</span>
        ) : (
          <span className="text-label text-ink-faint">Locked</span>
        )}
      </div>
    </li>
  );
}

function LevelHeader({ xp, unlocked, total }: { xp: NonNullable<ReturnType<typeof useProgression>["data"]>["xp"]; unlocked: number; total: number }) {
  const lit = xp.level !== null;
  return (
    <section aria-labelledby="level-title" className="glass-card flex flex-wrap items-end justify-between gap-6 p-6">
      <div className="flex items-end gap-5">
        <div className="flex flex-col gap-1">
          <span id="level-title" className="text-label text-ink-muted">
            Level
          </span>
          <span className={cn("numeric font-display text-hero leading-none font-semibold", lit ? "text-ink" : "text-ink-faint")}>
            {lit ? <NumberTicker id="achievements-level" value={xp.level!} format={plain} /> : "–"}
          </span>
        </div>
        <div className="flex flex-col gap-2 pb-1">
          <span className="font-display text-headline font-semibold text-accent">{xp.title ?? "No level yet"}</span>
          {lit && (
            <span className="flex w-[280px] flex-col gap-1.5">
              <span aria-hidden className="relative block h-1.5 overflow-hidden rounded-full bg-glass-border-strong">
                <span
                  className="absolute inset-0 origin-left rounded-full bg-accent transition-transform duration-[var(--dur-slow)] ease-out-quint"
                  style={{ transform: `scaleX(${xp.progress})` }}
                />
              </span>
              <span className="numeric text-label text-ink-muted">
                {xp.intoLevel.toLocaleString()} of {xp.toNext.toLocaleString()} XP to level {xp.level! + 1}
              </span>
            </span>
          )}
        </div>
      </div>
      <dl className="flex gap-8">
        <div className="flex flex-col items-end gap-0.5">
          <dt className="text-label text-ink-muted">Total XP</dt>
          <dd className="numeric font-display text-headline font-semibold text-ink">{xp.totalXp.toLocaleString()}</dd>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <dt className="text-label text-ink-muted">Today</dt>
          <dd className="numeric font-display text-headline font-semibold text-ink">+{xp.todayTotal}</dd>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <dt className="text-label text-ink-muted">Achievements</dt>
          <dd className="numeric font-display text-headline font-semibold text-ink">
            {unlocked}
            <span className="text-body text-ink-muted"> / {total}</span>
          </dd>
        </div>
      </dl>
      {lit && xp.level! < 10 && (
        <p className="w-full text-body-sm text-ink-muted">
          Level 10 ({(xpForLevel(10) - xp.totalXp).toLocaleString()} XP away) makes you a Pattern Hunter.
        </p>
      )}
    </section>
  );
}

/** Achievements: your level, then every achievement by category, earned ones first. */
export function Achievements() {
  const { data, isLoading } = useProgression();
  if (isLoading) return <p className="text-body-sm text-ink-muted">Adding up your history…</p>;
  if (!data?.hasData) {
    return (
      <EmptyState icon={Trophy} title="Nothing unlocked yet">
        Achievements mark real milestones: rank promotions, long streaks, topics mastered. Your level and every unlock collect here after
        the first sync, counted from your whole history.
      </EmptyState>
    );
  }
  const unlocked = data.achievements.filter((a) => a.unlocked).length;
  return (
    <div className="flex flex-col gap-4">
      <LevelHeader xp={data.xp} unlocked={unlocked} total={data.achievements.length} />
      {CATEGORIES.map((cat) => {
        const list = data.achievements
          .filter((a) => a.def.category === cat)
          .sort((a, b) => Number(b.unlocked) - Number(a.unlocked));
        const got = list.filter((a) => a.unlocked).length;
        return (
          <section key={cat} aria-labelledby={`cat-${cat}`} className="flex flex-col gap-3 pt-4">
            <h2 id={`cat-${cat}`} className="flex items-baseline gap-2 text-title font-semibold text-ink">
              {cat}
              <span className="numeric text-label font-normal text-ink-muted">
                {got} of {list.length}
              </span>
            </h2>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {list.map((a) => (
                <AchievementCard key={a.id} a={a} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
