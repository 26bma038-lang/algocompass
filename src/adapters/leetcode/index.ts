import type {
  Contest,
  LcCalendar,
  LcContestEntry,
  LcContestRanking,
  LcProblemMeta,
  LcProfile,
  LcRecentAc,
  LcTagCount,
  LcTagLevel,
} from "@/data/types";
import { AdapterError, defaultFetch, fetchFailure, inTauri, type FetchLike } from "../http";

/**
 * LeetCode adapter over the UNOFFICIAL GraphQL endpoint. It can change without notice, so:
 * every response is validated field by field, missing data degrades to null/empty, and
 * all failures surface as AdapterError("lc", …) so callers can fail soft.
 */
export const LC_GRAPHQL_URL = "https://leetcode.com/graphql";
/** Vite dev-server proxy (vite.config.ts). Only exists under `npm run dev` in a plain browser. */
export const LC_DEV_PROXY_URL = "/__leetcode/graphql";

/**
 * Where a LeetCode request goes, decided per request (never at module load):
 * - inside Tauri (`tauri dev` and the packaged .exe): straight to leetcode.com through
 *   tauri-plugin-http. The Vite proxy doesn't exist in the .exe, so Tauri never uses it.
 * - plain-browser dev: LeetCode blocks CORS, so through the Vite dev proxy.
 * - anywhere else (Node tests, scripts): straight to leetcode.com with the global fetch.
 */
export function leetcodeEndpoint(env: { tauri: boolean; viteDev: boolean; browser: boolean }): string {
  if (env.tauri) return LC_GRAPHQL_URL;
  return env.viteDev && env.browser ? LC_DEV_PROXY_URL : LC_GRAPHQL_URL;
}

const currentEndpoint = () =>
  leetcodeEndpoint({ tauri: inTauri(), viteDev: import.meta.env.DEV, browser: typeof window !== "undefined" });

const Q = {
  profile: `query lcProfile($username: String!) {
    allQuestionsCount { difficulty count }
    matchedUser(username: $username) {
      username
      profile { ranking }
      submitStatsGlobal { acSubmissionNum { difficulty count } }
    }
  }`,
  tags: `query lcTags($username: String!) {
    matchedUser(username: $username) {
      tagProblemCounts {
        advanced { tagName tagSlug problemsSolved }
        intermediate { tagName tagSlug problemsSolved }
        fundamental { tagName tagSlug problemsSolved }
      }
    }
  }`,
  contest: `query lcContest($username: String!) {
    userContestRanking(username: $username) { attendedContestsCount rating globalRanking topPercentage }
    userContestRankingHistory(username: $username) {
      attended rating ranking problemsSolved totalProblems
      contest { title startTime }
    }
  }`,
  calendar: `query lcCalendar($username: String!, $year: Int) {
    matchedUser(username: $username) { userCalendar(year: $year) { submissionCalendar } }
  }`,
  recentAc: `query lcRecentAc($username: String!, $limit: Int!) {
    recentAcSubmissionList(username: $username, limit: $limit) { id title titleSlug timestamp }
  }`,
  upcoming: `query lcUpcoming { upcomingContests { title titleSlug startTime duration } }`,
} as const;

// ---- defensive readers ----
type Json = unknown;
const isObj = (v: Json): v is Record<string, Json> => typeof v === "object" && v !== null && !Array.isArray(v);
const arr = (v: Json): Json[] => (Array.isArray(v) ? v : []);
const num = (v: Json): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};
const str = (v: Json): string | null => (typeof v === "string" ? v : null);
const get = (v: Json, ...path: string[]): Json => {
  let cur = v;
  for (const p of path) cur = isObj(cur) ? cur[p] : undefined;
  return cur;
};

function byDifficulty(rows: Json): { easy: number; medium: number; hard: number; all: number } {
  const out = { easy: 0, medium: 0, hard: 0, all: 0 };
  for (const r of arr(rows)) {
    const d = str(get(r, "difficulty"))?.toLowerCase();
    const c = num(get(r, "count")) ?? 0;
    if (d === "easy" || d === "medium" || d === "hard" || d === "all") out[d] = c;
  }
  return out;
}

export class LeetCodeAdapter {
  private readonly fetchImpl: FetchLike;

  constructor(options: { fetch?: FetchLike } = {}) {
    this.fetchImpl = options.fetch ?? defaultFetch;
  }

  private async gql(query: string, variables: Record<string, unknown>): Promise<Record<string, Json>> {
    let res: Response;
    try {
      res = await this.fetchImpl(currentEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Referer: "https://leetcode.com/",
          Origin: "https://leetcode.com",
        },
        body: JSON.stringify({ query, variables }),
      });
    } catch (e) {
      throw fetchFailure("lc", "LeetCode", e);
    }
    if (res.status === 429) throw new AdapterError("lc", "rate-limit", "LeetCode is rate-limiting requests");
    if (!res.ok) throw new AdapterError("lc", "http", `LeetCode returned HTTP ${res.status}`);

    let body: Json;
    try {
      body = await res.json();
    } catch {
      throw new AdapterError("lc", "parse", "LeetCode returned an unreadable response");
    }
    const errors = arr(get(body, "errors"));
    const data = get(body, "data");
    if (!isObj(data)) {
      const msg = str(get(errors[0], "message")) ?? "no data";
      throw new AdapterError("lc", "api", `LeetCode: ${msg}`);
    }
    return data;
  }

  async getProfile(username: string): Promise<LcProfile> {
    const data = await this.gql(Q.profile, { username });
    const user = data.matchedUser;
    if (!isObj(user)) throw new AdapterError("lc", "not-found", `LeetCode user "${username}" not found`);
    return {
      username: str(user.username) ?? username,
      ranking: num(get(user, "profile", "ranking")),
      solved: byDifficulty(get(user, "submitStatsGlobal", "acSubmissionNum")),
      totals: byDifficulty(data.allQuestionsCount),
    };
  }

  async getTagCounts(username: string): Promise<LcTagCount[]> {
    const data = await this.gql(Q.tags, { username });
    const groups = get(data, "matchedUser", "tagProblemCounts");
    const out: LcTagCount[] = [];
    for (const level of ["fundamental", "intermediate", "advanced"] as LcTagLevel[]) {
      for (const t of arr(get(groups, level))) {
        const slug = str(get(t, "tagSlug"));
        if (!slug) continue;
        out.push({ slug, name: str(get(t, "tagName")) ?? slug, level, solved: num(get(t, "problemsSolved")) ?? 0 });
      }
    }
    return out;
  }

  async getContestData(username: string): Promise<{ ranking: LcContestRanking | null; history: LcContestEntry[] }> {
    const data = await this.gql(Q.contest, { username });
    const r = data.userContestRanking;
    const rating = num(get(r, "rating"));
    const ranking: LcContestRanking | null =
      isObj(r) && rating !== null
        ? {
            rating,
            attended: num(r.attendedContestsCount) ?? 0,
            globalRanking: num(r.globalRanking),
            topPercentage: num(r.topPercentage),
          }
        : null;
    const history = arr(data.userContestRankingHistory)
      .filter((h) => get(h, "attended") === true)
      .map((h) => ({
        title: str(get(h, "contest", "title")) ?? "Contest",
        startTime: num(get(h, "contest", "startTime")) ?? 0,
        rating: num(get(h, "rating")) ?? 0,
        ranking: num(get(h, "ranking")) ?? 0,
        solved: num(get(h, "problemsSolved")) ?? 0,
        total: num(get(h, "totalProblems")) ?? 0,
      }));
    return { ranking, history };
  }

  /** Submission calendar for a year (default: LeetCode's "last 12 months" view). */
  async getCalendar(username: string, year?: number): Promise<LcCalendar> {
    const data = await this.gql(Q.calendar, { username, year: year ?? null });
    const raw = str(get(data, "matchedUser", "userCalendar", "submissionCalendar"));
    if (!raw) return {};
    let parsed: Json;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new AdapterError("lc", "parse", "LeetCode submission calendar was malformed");
    }
    const out: LcCalendar = {};
    if (isObj(parsed)) {
      for (const [k, v] of Object.entries(parsed)) {
        const day = Number(k);
        const count = num(v);
        if (Number.isFinite(day) && count !== null) out[day] = count;
      }
    }
    return out;
  }

  async getRecentAc(username: string, limit = 20): Promise<LcRecentAc[]> {
    const data = await this.gql(Q.recentAc, { username, limit });
    return arr(data.recentAcSubmissionList).flatMap((s) => {
      const id = str(get(s, "id"));
      const ts = num(get(s, "timestamp"));
      if (!id || ts === null) return [];
      return [{ id, title: str(get(s, "title")) ?? "", slug: str(get(s, "titleSlug")) ?? "", timestamp: ts }];
    });
  }

  /**
   * Difficulty + topic tags for specific problems, batched as aliased `question` lookups.
   * Slugs are validated before being placed in the query text.
   */
  async getProblemMeta(slugs: string[]): Promise<LcProblemMeta[]> {
    const safe = [...new Set(slugs)].filter((s) => /^[a-z0-9-]+$/.test(s));
    const out: LcProblemMeta[] = [];
    for (let i = 0; i < safe.length; i += 20) {
      const chunk = safe.slice(i, i + 20);
      const fields = chunk
        .map((s, j) => `q${j}: question(titleSlug: "${s}") { titleSlug difficulty topicTags { slug } }`)
        .join("\n");
      const data = await this.gql(`query lcProblemMeta {\n${fields}\n}`, {});
      chunk.forEach((_, j) => {
        const q = data[`q${j}`];
        const slug = str(get(q, "titleSlug"));
        const difficulty = str(get(q, "difficulty"));
        if (!slug || (difficulty !== "Easy" && difficulty !== "Medium" && difficulty !== "Hard")) return;
        const tags = arr(get(q, "topicTags")).flatMap((t) => {
          const s = str(get(t, "slug"));
          return s ? [s] : [];
        });
        out.push({ slug, difficulty, tags });
      });
    }
    return out;
  }

  async getUpcomingContests(nowSeconds = Math.floor(Date.now() / 1000)): Promise<Contest[]> {
    const data = await this.gql(Q.upcoming, {});
    return arr(data.upcomingContests).flatMap((c) => {
      const slug = str(get(c, "titleSlug"));
      const start = num(get(c, "startTime"));
      if (!slug || start === null) return [];
      const duration = num(get(c, "duration")) ?? 5400;
      const phase = start > nowSeconds ? "upcoming" : start + duration > nowSeconds ? "running" : "finished";
      return [
        {
          id: `lc:${slug}`,
          platform: "lc" as const,
          name: str(get(c, "title")) ?? slug,
          startTime: start,
          durationSeconds: duration,
          phase,
          url: `https://leetcode.com/contest/${slug}/`,
        },
      ];
    });
  }
}
