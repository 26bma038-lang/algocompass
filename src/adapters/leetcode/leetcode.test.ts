import { describe, expect, it } from "vitest";
import { AdapterError } from "../http";
import { stubFetch } from "@/test/sqljs";
import { LeetCodeAdapter } from "./index";

const body = (init?: RequestInit) => JSON.parse(String(init?.body)) as { query: string; variables: Record<string, unknown> };

describe("LeetCodeAdapter", () => {
  it("sends JSON + Referer/Origin headers and parses the profile", async () => {
    const { fetch, calls } = stubFetch(() => ({
      data: {
        allQuestionsCount: [
          { difficulty: "All", count: 4082 },
          { difficulty: "Easy", count: 971 },
          { difficulty: "Medium", count: 2128 },
          { difficulty: "Hard", count: 983 },
        ],
        matchedUser: {
          username: "xfO61DFAh6",
          profile: { ranking: 4683476 },
          submitStatsGlobal: {
            acSubmissionNum: [
              { difficulty: "All", count: 19 },
              { difficulty: "Easy", count: 14 },
              { difficulty: "Medium", count: 3 },
              { difficulty: "Hard", count: 2 },
            ],
          },
        },
      },
    }));
    const p = await new LeetCodeAdapter({ fetch }).getProfile("xfO61DFAh6");
    const headers = calls[0]!.init!.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers.Referer).toBe("https://leetcode.com/");
    expect(body(calls[0]!.init).variables).toEqual({ username: "xfO61DFAh6" });
    expect(p).toEqual({
      username: "xfO61DFAh6",
      ranking: 4683476,
      solved: { all: 19, easy: 14, medium: 3, hard: 2 },
      totals: { all: 4082, easy: 971, medium: 2128, hard: 983 },
    });
  });

  it("reports unknown users as not-found", async () => {
    const { fetch } = stubFetch(() => ({ data: { allQuestionsCount: [], matchedUser: null } }));
    const err = await new LeetCodeAdapter({ fetch }).getProfile("ghost").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AdapterError);
    expect((err as AdapterError).kind).toBe("not-found");
  });

  it("surfaces GraphQL errors and HTTP failures as AdapterErrors", async () => {
    const gqlErr = stubFetch(() => ({ errors: [{ message: "Cannot query field" }], data: null }));
    const e1 = await new LeetCodeAdapter({ fetch: gqlErr.fetch }).getTagCounts("u").catch((e: unknown) => e);
    expect((e1 as AdapterError).message).toContain("Cannot query field");

    const http = stubFetch(() => new Response("blocked", { status: 403 }));
    const e2 = await new LeetCodeAdapter({ fetch: http.fetch }).getTagCounts("u").catch((e: unknown) => e);
    expect((e2 as AdapterError).kind).toBe("http");
  });

  it("handles users with no contest history", async () => {
    const { fetch } = stubFetch(() => ({ data: { userContestRanking: null, userContestRankingHistory: [] } }));
    expect(await new LeetCodeAdapter({ fetch }).getContestData("u")).toEqual({ ranking: null, history: [] });
  });

  it("keeps only attended contests in history", async () => {
    const { fetch } = stubFetch(() => ({
      data: {
        userContestRanking: { attendedContestsCount: 1, rating: 1520.4, globalRanking: 9000, topPercentage: 40.1 },
        userContestRankingHistory: [
          { attended: false, rating: 1500, ranking: 0, problemsSolved: 0, totalProblems: 4, contest: { title: "W1", startTime: 1 } },
          { attended: true, rating: 1520.4, ranking: 3000, problemsSolved: 2, totalProblems: 4, contest: { title: "W2", startTime: 2 } },
        ],
      },
    }));
    const { ranking, history } = await new LeetCodeAdapter({ fetch }).getContestData("u");
    expect(ranking?.rating).toBe(1520.4);
    expect(history).toEqual([{ title: "W2", startTime: 2, rating: 1520.4, ranking: 3000, solved: 2, total: 4 }]);
  });

  it("parses the stringified submission calendar and skips junk", async () => {
    const { fetch } = stubFetch(() => ({
      data: { matchedUser: { userCalendar: { submissionCalendar: '{"1775952000": 7, "bad": 1, "1777507200": "2"}' } } },
    }));
    expect(await new LeetCodeAdapter({ fetch }).getCalendar("u")).toEqual({ 1775952000: 7, 1777507200: 2 });
  });

  it("parses tag counts across levels and tolerates missing groups", async () => {
    const { fetch } = stubFetch(() => ({
      data: {
        matchedUser: {
          tagProblemCounts: {
            fundamental: [{ tagName: "Array", tagSlug: "array", problemsSolved: 9 }],
            advanced: [{ tagName: "Trie", tagSlug: "trie", problemsSolved: 1 }, { tagName: "No slug" }],
          },
        },
      },
    }));
    expect(await new LeetCodeAdapter({ fetch }).getTagCounts("u")).toEqual([
      { slug: "array", name: "Array", level: "fundamental", solved: 9 },
      { slug: "trie", name: "Trie", level: "advanced", solved: 1 },
    ]);
  });

  it("normalizes recent ACs and upcoming contests", async () => {
    const { fetch } = stubFetch((_, init) =>
      body(init).query.includes("recentAcSubmissionList")
        ? { data: { recentAcSubmissionList: [{ id: "1", title: "Two Sum", titleSlug: "two-sum", timestamp: "1700000000" }] } }
        : { data: { upcomingContests: [{ title: "Weekly Contest 524", titleSlug: "weekly-contest-524", startTime: 2000, duration: 5400 }] } },
    );
    const lc = new LeetCodeAdapter({ fetch });
    expect(await lc.getRecentAc("u", 5)).toEqual([{ id: "1", title: "Two Sum", slug: "two-sum", timestamp: 1700000000 }]);
    expect(await lc.getUpcomingContests(1000)).toEqual([
      {
        id: "lc:weekly-contest-524",
        platform: "lc",
        name: "Weekly Contest 524",
        startTime: 2000,
        durationSeconds: 5400,
        phase: "upcoming",
        url: "https://leetcode.com/contest/weekly-contest-524/",
      },
    ]);
  });
});
