import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useProgression } from "@/data/progression";
import { badgesToShow } from "@/engine/progress";
import { AchievementBadge } from "@/features/achievements/AchievementBadge";
import { LABELS } from "@/lib/glossary";
import { BADGES_PATH } from "./tabs";

const date = (t: number) => new Date(t * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short" });

/**
 * Badges on Overview (v1.4: the Achievements tab became this card). The latest earned, then the
 * closest to being earned to fill three, and "See all" for the full set.
 */
export function BadgesCard({ columns = 3 }: { columns?: 1 | 3 }) {
  const { data } = useProgression();
  if (!data) return <section aria-busy className="glass-card h-[180px] p-6" />;
  const { earned, list } = badgesToShow(data.achievements);
  const got = data.achievements.filter((a) => a.unlocked).length;
  return (
    <section aria-labelledby="badges-title" className="glass-card flex flex-col gap-4 p-6">
      {/* Inline header (not CardHeader): its 256px title minimum would wrap the pill in a 4-column card. */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="badges-title" className="font-display text-headline font-semibold text-ink">
            {LABELS.badges}
          </h2>
          <p className="text-body-sm text-ink-muted">{earned === 0 ? "None yet. These are the closest." : earned < list.length ? `${got} of ${data.achievements.length} earned. Your latest, then the next to earn.` : `${got} of ${data.achievements.length} earned. Your latest.`}</p>
        </div>
        <Link
          to={BADGES_PATH}
          className="shrink-0 rounded-xs pt-1.5 text-body-sm text-ink-muted underline decoration-glass-border-strong underline-offset-4 hover:text-ink"
        >
          See all {data.achievements.length}
        </Link>
      </div>
      <ul className={columns === 3 ? "grid grid-cols-1 gap-3 md:grid-cols-3" : "flex flex-col gap-3"}>
        {list.map((a) => (
          <li key={a.id} className={a.unlocked ? "flex items-center gap-3 rounded-md bg-abyss-sunken p-3 [[data-theme=light]_&]:bg-abyss-raised [[data-theme=light]_&]:shadow-slab" : "flex items-center gap-3 rounded-md border border-dashed border-glass-border p-3"}>
            <AchievementBadge icon={a.def.icon} unlocked={a.unlocked} size="sm" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-body-sm font-semibold text-ink">{a.def.title}</span>
              {a.unlocked ? (
                <span className="flex items-center gap-1 text-label text-ink-muted">
                  <Check aria-hidden className="size-3 text-success" strokeWidth={2.6} />
                  {a.at !== null ? `Earned ${date(a.at)}` : "Earned"}
                </span>
              ) : (
                <span className="line-clamp-2 text-label text-ink-muted">{a.def.hint}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
