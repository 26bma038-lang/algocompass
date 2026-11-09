import { describe, expect, it } from "vitest";
import type { TopicGroup } from "./learn";
import type { PoolProblem } from "./mustDo";
import type { BeginnerPath } from "./path";
import type { ProblemRef } from "./problemRef";
import { easierProblem, editorialLinks, stuckTopic, stuckVideo } from "./stuck";

const pp = (key: string, p: Partial<PoolProblem> = {}): PoolProblem => ({
  key,
  title: key,
  difficulty: "Medium",
  topics: ["graphs"],
  sheets: [],
  inPath: false,
  leadTopics: ["graphs"],
  ...p,
});
const ref = (p: Partial<ProblemRef> = {}): ProblemRef => ({ key: "lc:hard", title: "Hard", platform: "lc", topics: ["graphs"], difficulty: "Hard", rating: null, lc: "hard", url: null, ...p });
const never = () => false;

describe("easierProblem", () => {
  it("picks the closest easier unsolved problem on the topic, not the problem itself", () => {
    const pool = { problems: [pp("lc:hard", { difficulty: "Hard" }), pp("lc:med", { difficulty: "Medium" }), pp("lc:easy", { difficulty: "Easy" })] };
    expect(easierProblem(pool, ref(), never)?.key).toBe("lc:med");
  });
  it("skips solved ones, Premium ones and other topics", () => {
    const pool = { problems: [pp("lc:med", { premium: true }), pp("lc:easy", { difficulty: "Easy" }), pp("lc:dp", { topics: ["dp"], leadTopics: ["dp"], difficulty: "Easy" })] };
    expect(easierProblem(pool, ref(), (k) => k === "lc:easy")).toBeNull();
    expect(easierProblem(pool, ref(), never)?.key).toBe("lc:easy");
  });
  it("is null for the easiest problems, and when the topic is unknown", () => {
    const pool = { problems: [pp("lc:easy", { difficulty: "Easy" })] };
    expect(easierProblem(pool, ref({ difficulty: "Easy" }), never)).toBeNull();
    expect(easierProblem(pool, ref({ topics: [] }), never)).toBeNull();
  });
  it("compares a Codeforces rating by band, and offers only Easy for an unrated one", () => {
    const pool = { problems: [pp("cf:1-A", { difficulty: null, rating: 800 }), pp("cf:2-B", { difficulty: null, rating: 1500 })] };
    expect(easierProblem(pool, ref({ key: "cf:9-C", platform: "cf", difficulty: null, rating: 1900, lc: undefined, cf: "9-C" }), never)?.key).toBe("cf:2-B");
    expect(easierProblem(pool, ref({ difficulty: null, rating: null }), never)?.key).toBe("cf:1-A");
  });
  it("prefers the topic's home problems, then the ones more sheets list", () => {
    const pool = { problems: [pp("lc:a", { difficulty: "Easy", leadTopics: ["dp"] }), pp("lc:b", { difficulty: "Easy", sheets: ["s1", "s2"] }), pp("lc:c", { difficulty: "Easy" })] };
    expect(easierProblem(pool, ref({ difficulty: "Medium" }), never)?.key).toBe("lc:b");
  });
});

describe("editorialLinks", () => {
  it("gives LeetCode its editorial and solutions pages", () => {
    expect(editorialLinks(ref({ lc: "two-sum" })).map((l) => l.url)).toEqual(["https://leetcode.com/problems/two-sum/editorial/", "https://leetcode.com/problems/two-sum/solutions/"]);
  });
  it("sends a Codeforces problem to its round's page, gym rounds to the gym", () => {
    expect(editorialLinks(ref({ lc: undefined, cf: "1850-A", platform: "cf" }))[0]!.url).toBe("https://codeforces.com/contest/1850");
    expect(editorialLinks(ref({ lc: undefined, cf: "102000-B", platform: "cf" }))[0]!.url).toBe("https://codeforces.com/gym/102000");
  });
  it("falls back to the problem's own page, or to nothing", () => {
    expect(editorialLinks(ref({ lc: undefined, platform: "other", url: "https://example.com/p" }))).toHaveLength(1);
    expect(editorialLinks(ref({ lc: undefined, platform: "other", url: null }))).toEqual([]);
  });
});

describe("stuckVideo", () => {
  const path = { steps: [{ topics: ["graphs"] }] } as unknown as BeginnerPath;
  const v = (id: string, lang: "en" | "hi", title: string, extra: Partial<TopicGroup["videos"][number]> = {}) =>
    ({ id, lang, role: "lecture", minutes: 10, title, channel: "c", codeLang: "concept", ...extra }) as TopicGroup["videos"][number];
  const groups: TopicGroup[] = [{ topicId: "graphs", name: "Graphs", videos: [v("w1", "en", "Graph traversals: BFS and DFS"), v("w2", "hi", "Graph series, part 1")] }];
  it("is a video of the topic, in your language, unwatched first", () => {
    expect(stuckVideo(groups, "graphs", path, new Set(), "hi")?.id).toBe("w2");
    expect(stuckVideo(groups, "graphs", path, new Set(["w1"]), "en")?.id).toBe("w2");
  });
  it("is null with no topic or no videos", () => {
    expect(stuckVideo(groups, undefined, path, new Set(), "en")).toBeNull();
    expect(stuckVideo(groups, "dp", path, new Set(), "en")).toBeNull();
  });
  it("v1.8: only offers a video that's clearly about the topic (its title, or the path's own lesson)", () => {
    const offTopic: TopicGroup[] = [{ topicId: "implementation", name: "Basics", videos: [v("x1", "en", "How to start Competitive Programming? For beginners!")] }];
    expect(stuckVideo(offTopic, "implementation", path, new Set(), "en")).toBeNull();
    const lesson: TopicGroup[] = [{ topicId: "graphs", name: "Graphs", videos: [v("l1", "en", "Lecture one", { role: "lesson", step: 0 }), v("x2", "en", "Something else")] }];
    expect(stuckVideo(lesson, "graphs", path, new Set(), "en")?.id).toBe("l1");
  });
  it("v1.8: puts an explanation before a problem walkthrough", () => {
    const both: TopicGroup[] = [{ topicId: "graphs", name: "Graphs", videos: [v("p1", "en", "Number of Islands | Graph problem", { role: "walkthrough" }), v("c1", "en", "Graph theory intro", { role: "intro" })] }];
    expect(stuckVideo(both, "graphs", path, new Set(), "en")?.id).toBe("c1");
  });
});

describe("stuckTopic (v1.8)", () => {
  it("skips the broad Codeforces tags when the problem has a specific one", () => {
    expect(stuckTopic({ topics: ["implementation", "greedy"] })).toBe("greedy");
    expect(stuckTopic({ topics: ["math", "brute-force", "number-theory"] })).toBe("number-theory");
    expect(stuckTopic({ topics: ["implementation"] })).toBe("implementation");
    expect(stuckTopic({ topics: [] })).toBeUndefined();
  });
});
