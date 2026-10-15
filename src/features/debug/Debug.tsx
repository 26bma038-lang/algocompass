import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSyncLog, useTableCounts, useTableDump, useTopicReport } from "@/data/queries";
import { TABLES, type TableName } from "@/data/repo";
import { useProgression } from "@/data/progression";
import { useSyncStore } from "@/data/syncStore";
import { useUiStore } from "@/data/uiStore";
import { bandForRating, RANK_BANDS } from "@/lib/rank";
import { titleForLevel } from "@/engine/xp";
import { cn } from "@/lib/utils";

const time = (s: number) => new Date(s * 1000).toLocaleString();

function TopicReportSection() {
  const report = useTopicReport();
  if (report.isLoading) return <section className="glass-card p-5 text-body-sm text-ink-muted">Computing topic strengths…</section>;
  if (report.error || !report.data) {
    return <section className="glass-card p-5 text-body-sm text-danger">Topic engine failed: {String(report.error)}</section>;
  }
  const { topics, standing, cfRating } = report.data;
  const sorted = [...topics].sort((a, b) => b.score - a.score);
  const groups = [
    ["Strengths", standing.strengths],
    ["Weaknesses", standing.weaknesses],
    ["Blind spots", standing.blindSpots],
  ] as const;

  return (
    <section className="glass-card p-5">
      <h2 className="text-title font-semibold">Topic engine</h2>
      <p className="text-body-sm text-ink-muted">CF rating used: {cfRating ?? "unrated (800 baseline)"}</p>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {groups.map(([label, items]) => (
          <div key={label} className="rounded-md bg-abyss-sunken p-3">
            <p className="text-body-sm font-semibold">{label}</p>
            <ul className="mt-1 space-y-1 text-body-sm">
              {items.length === 0 && <li className="text-ink-faint">None</li>}
              {items.map((i) => (
                <li key={i.topicId}>
                  <span className="text-ink">{i.name}</span> <span className="numeric text-ink-muted">{i.score}</span>
                  <span className="block text-ink-faint">{i.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <table className="mt-4 w-full text-left text-body-sm">
        <thead className="text-label text-ink-muted">
          <tr>
            {["Topic", "Score", "Status", "Solved (CF / LC)", "Max CF", "Struggle", "Last practiced"].map((h) => (
              <th key={h} className="py-1 pr-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="numeric">
          {sorted.map((t) => (
            <tr key={t.topicId} className="border-t border-glass-border">
              <td className="py-1 pr-3">{t.name}</td>
              <td className="pr-3">{t.score}</td>
              <td className="pr-3 text-ink-muted">{t.status}</td>
              <td className="pr-3">
                {t.solvedCount} ({t.cfSolved} / {t.lcSolved})
              </td>
              <td className="pr-3">{t.maxCfRatingSolved ?? "–"}</td>
              <td className="pr-3">{t.struggleRate === null ? "–" : `${Math.round(t.struggleRate * 100)}%`}</td>
              <td className="text-ink-muted">{t.lastPracticedAt ? new Date(t.lastPracticedAt * 1000).toLocaleDateString() : "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** Previews of the progression moments. They change nothing: your real rank comes back after. */
function CeremonyPreviews() {
  const start = useUiStore((s) => s.startCeremony);
  const p = useProgression().data;
  const from = RANK_BANDS.indexOf(bandForRating(p?.cfRating ?? 0).current);
  const to = Math.min(from + 1, RANK_BANDS.length - 1);
  const level = p?.xp.level ?? 1;
  return (
    <section className="glass-card flex flex-wrap items-center gap-3 p-5">
      <h2 className="mr-auto text-title font-semibold">Ceremony previews</h2>
      <Button size="sm" variant="outline" onClick={() => start({ kind: "rank", from, to, preview: true })} disabled={from === to}>
        Preview Aura Shift ({RANK_BANDS[from]!.label} → {RANK_BANDS[to]!.label})
      </Button>
      <Button size="sm" variant="outline" onClick={() => start({ kind: "level", level: level + 1, title: titleForLevel(level + 1) })}>
        Preview level-up
      </Button>
    </section>
  );
}

/** Hidden page (Ctrl+Shift+D): raw synced data for checking the data layer. */
export function Debug() {
  const { syncing, lastResult, run } = useSyncStore();
  const counts = useTableCounts();
  const log = useSyncLog(30);
  const [table, setTable] = useState<TableName>("profiles");
  const [limit, setLimit] = useState(25);
  const dump = useTableDump(table, limit);

  return (
    <div className="flex flex-col gap-6">
      <CeremonyPreviews />
      <section className="glass-card flex flex-wrap items-center gap-3 p-5">
        <h2 className="mr-auto text-title font-semibold">Sync</h2>
        <Button size="sm" onClick={() => void run()} disabled={syncing}>
          {syncing ? "Syncing…" : "Sync now"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => void run({ forceProblemset: true })} disabled={syncing}>
          Sync and refresh problemset
        </Button>
        {lastResult && (
          <div className="grid w-full grid-cols-2 gap-4 pt-2">
            {[lastResult.cf, lastResult.lc].map((p) => (
              <div key={p.platform} className="rounded-md bg-abyss-sunken p-3">
                <p className="text-body-sm font-semibold">
                  {p.platform === "cf" ? "Codeforces" : "LeetCode"}: {p.ok ? "ok" : "errors"}
                </p>
                <ul className="mt-1 text-body-sm text-ink-muted">
                  {p.steps.map((s) => (
                    <li key={s.kind} className={cn(s.status === "error" && "text-danger")}>
                      {s.kind}: {s.status} ({s.items}){s.message ? `, ${s.message}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <TopicReportSection />

      <section className="glass-card p-5">
        <h2 className="text-title font-semibold">Tables</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {TABLES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTable(t)}
              aria-pressed={table === t}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-label",
                table === t ? "border-accent-line bg-accent-soft text-ink" : "border-glass-border bg-glass text-ink-muted hover:text-ink",
              )}
            >
              {t}
              <span className="numeric text-ink-faint">{counts.data?.[t] ?? "…"}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 text-body-sm text-ink-muted">
          Showing first
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="h-7 rounded-xs border border-glass-border bg-abyss-sunken px-1.5 text-ink"
          >
            {[10, 25, 100, 500].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          rows
        </div>
        <pre className="mt-3 max-h-[420px] overflow-auto rounded-md bg-abyss-sunken p-3 text-[12px] leading-relaxed text-ink-muted select-text">
          {dump.isLoading ? "Loading…" : dump.error ? String(dump.error) : JSON.stringify(dump.data, null, 2)}
        </pre>
      </section>

      <section className="glass-card p-5">
        <h2 className="text-title font-semibold">Sync log</h2>
        <table className="mt-3 w-full text-left text-body-sm">
          <thead className="text-label text-ink-muted">
            <tr>
              <th className="py-1 font-medium">Finished</th>
              <th className="font-medium">Step</th>
              <th className="font-medium">Status</th>
              <th className="font-medium">Items</th>
              <th className="font-medium">Message</th>
            </tr>
          </thead>
          <tbody className="numeric">
            {log.data?.map((e) => (
              <tr key={e.id} className="border-t border-glass-border">
                <td className="py-1 pr-3 whitespace-nowrap text-ink-muted">{time(e.finishedAt)}</td>
                <td className="pr-3">{e.kind}</td>
                <td className={cn("pr-3", e.status === "error" && "text-danger")}>{e.status}</td>
                <td className="pr-3">{e.items}</td>
                <td className="text-ink-muted">{e.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
