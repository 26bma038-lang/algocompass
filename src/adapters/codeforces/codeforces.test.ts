import { describe, expect, it } from "vitest";
import { AdapterError } from "../http";
import { stubFetch } from "@/test/sqljs";
import { CodeforcesAdapter, problemKey } from "./index";

const ok = (result: unknown) => ({ status: "OK", result });

describe("CodeforcesAdapter", () => {
  it("normalizes user.info", async () => {
    const { fetch } = stubFetch(() =>
      ok([{ handle: "enkrid", rating: 1008, maxRating: 1100, rank: "newbie", maxRank: "newbie", registrationTimeSeconds: 1, titlePhoto: "p.jpg" }]),
    );
    const user = await new CodeforcesAdapter({ fetch, minIntervalMs: 0 }).getUser("enkrid");
    expect(user).toEqual({ handle: "enkrid", rating: 1008, maxRating: 1100, rank: "newbie", maxRank: "newbie", avatar: "p.jpg", registeredAt: 1 });
  });

  it("treats unrated users as null rating", async () => {
    const { fetch } = stubFetch(() => ok([{ handle: "x", registrationTimeSeconds: 1 }]));
    const user = await new CodeforcesAdapter({ fetch, minIntervalMs: 0 }).getUser("x");
    expect(user.rating).toBeNull();
    expect(user.rank).toBeNull();
  });

  it("turns FAILED envelopes into AdapterErrors", async () => {
    const { fetch } = stubFetch(
      () => new Response(JSON.stringify({ status: "FAILED", comment: "handles: User with handle nobody not found" }), { status: 400 }),
    );
    const err = await new CodeforcesAdapter({ fetch, minIntervalMs: 0 }).getUser("nobody").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AdapterError);
    expect((err as AdapterError).kind).toBe("not-found");
    expect((err as AdapterError).platform).toBe("cf");
  });

  it("retries once on call limit exceeded, then gives up", async () => {
    let n = 0;
    const { fetch, calls } = stubFetch(() => {
      n++;
      return n === 1 ? { status: "FAILED", comment: "Call limit exceeded" } : ok([]);
    });
    await expect(new CodeforcesAdapter({ fetch, minIntervalMs: 1 }).getRatingHistory("enkrid")).resolves.toEqual([]);
    expect(calls).toHaveLength(2);

    const always = stubFetch(() => ({ status: "FAILED", comment: "Call limit exceeded" }));
    const err = await new CodeforcesAdapter({ fetch: always.fetch, minIntervalMs: 1 }).getRatingHistory("e").catch((e: unknown) => e);
    expect((err as AdapterError).kind).toBe("rate-limit");
  });

  it("maps network failures", async () => {
    const fetch = async () => {
      throw new TypeError("offline");
    };
    const err = await new CodeforcesAdapter({ fetch, minIntervalMs: 0 }).getContests().catch((e: unknown) => e);
    expect((err as AdapterError).kind).toBe("network");
  });

  it("spaces calls by the minimum interval", async () => {
    const { fetch, calls } = stubFetch(() => ok([]));
    const cf = new CodeforcesAdapter({ fetch, minIntervalMs: 120 });
    await Promise.all([cf.getRatingHistory("a"), cf.getRatingHistory("b"), cf.getRatingHistory("c")]);
    expect(calls).toHaveLength(3);
    expect(calls[1]!.at - calls[0]!.at).toBeGreaterThanOrEqual(110);
    expect(calls[2]!.at - calls[1]!.at).toBeGreaterThanOrEqual(110);
  });

  it("passes paging params and normalizes submissions", async () => {
    const { fetch, calls } = stubFetch(() =>
      ok([
        {
          id: 10,
          contestId: 1900,
          creationTimeSeconds: 1700000000,
          programmingLanguage: "C++17",
          verdict: "OK",
          problem: { contestId: 1900, index: "B", name: "Sum", rating: 1200, tags: ["math", "greedy"] },
        },
      ]),
    );
    const [s] = await new CodeforcesAdapter({ fetch, minIntervalMs: 0 }).getSubmissions("enkrid", { from: 1, count: 100 });
    expect(calls[0]!.url).toContain("user.status?handle=enkrid&from=1&count=100");
    expect(s).toMatchObject({ id: 10, problemKey: "1900-B", problemRating: 1200, tags: ["math", "greedy"], verdict: "OK" });
  });

  it("joins problemset statistics and maps contest phases", async () => {
    const { fetch } = stubFetch((url) =>
      url.includes("problemset")
        ? ok({
            problems: [{ contestId: 1, index: "A", name: "P", rating: 800, tags: ["math"] }],
            problemStatistics: [{ contestId: 1, index: "A", solvedCount: 42 }],
          })
        : ok([
            { id: 2, name: "Round 2", phase: "BEFORE", durationSeconds: 7200, startTimeSeconds: 100 },
            { id: 1, name: "Round 1", phase: "FINISHED", durationSeconds: 7200, startTimeSeconds: 50 },
          ]),
    );
    const cf = new CodeforcesAdapter({ fetch, minIntervalMs: 0 });
    expect((await cf.getProblemset())[0]).toMatchObject({ key: "1-A", solvedCount: 42 });
    const contests = await cf.getContests();
    expect(contests.map((c) => [c.id, c.phase])).toEqual([["cf:2", "upcoming"], ["cf:1", "finished"]]);
  });

  it("builds problem keys for problemset-only problems", () => {
    expect(problemKey({ problemsetName: "acmsguru", index: "100" })).toBe("acmsguru-100");
  });
});
