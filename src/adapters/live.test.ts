/**
 * Live check against the real APIs with the user's handles. Skipped in normal runs;
 * run with `npm run test:live`. Writes a snapshot to tmp/live-snapshot.json (gitignored)
 * that the topic-engine check reuses.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CodeforcesAdapter } from "@/adapters/codeforces";
import { LeetCodeAdapter } from "@/adapters/leetcode";
import { DEFAULT_HANDLES } from "@/data/settings";
import { syncAll } from "@/data/sync";
import { buildTopicReport } from "@/engine/report";
import { memoryRepo } from "@/test/sqljs";

const LIVE = import.meta.env.MODE === "live";

describe.skipIf(!LIVE)("live sync (real Codeforces + LeetCode)", () => {
  it(
    "syncs both platforms into SQLite",
    async () => {
      const repo = await memoryRepo();
      const fetch = (url: string, init?: RequestInit) => globalThis.fetch(url, init);
      const res = await syncAll({
        repo,
        cf: new CodeforcesAdapter({ fetch }),
        lc: new LeetCodeAdapter({ fetch }),
        handles: DEFAULT_HANDLES,
      });
      for (const p of [res.cf, res.lc]) console.log(p.platform, p.ok ? "OK" : "ERRORS", JSON.stringify(p.steps));

      const snapshot = {
        syncedAt: new Date(res.finishedAt * 1000).toISOString(),
        counts: await repo.tableCounts(),
        cfProfile: (await repo.getProfile("cf"))?.data ?? null,
        cfRating: await repo.getCfRatingHistory(),
        cfSubmissions: await repo.getCfSubmissions(),
        lcProfile: (await repo.getProfile("lc"))?.data ?? null,
        lcStats: await repo.getLcStats(),
        lcTags: await repo.getLcTagCounts(),
        lcContests: await repo.getLcContestHistory(),
        lcRecent: await repo.getLcRecentAc(),
        lcProblems: await repo.getLcProblems(),
        activity: await repo.getDailyActivity(),
        upcoming: await repo.getContests(res.finishedAt),
        cfTagUniverse: [...new Set((await repo.getCfProblems()).flatMap((p) => p.tags))].sort(),
      };
      mkdirSync("tmp", { recursive: true });
      writeFileSync("tmp/live-snapshot.json", JSON.stringify(snapshot, null, 2));
      writeFileSync("tmp/topic-report.json", JSON.stringify(await buildTopicReport(repo), null, 2));

      expect(res.cf.ok).toBe(true);
      expect(res.lc.ok).toBe(true);
    },
    120_000,
  );
});
