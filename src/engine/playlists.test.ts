import { describe, expect, it } from "vitest";
import { filterPlaylists, frontierIndex, groupPlaylists, lengthLabel, playlistMinutes, playlistProgress, resumeIndex, type Playlist } from "./playlists";

const vids = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `v${i}`, title: `Part ${i + 1}`, minutes: 10 }));
const pl = (id: string, over: Partial<Playlist> = {}): Playlist => ({
  id,
  lang: "en",
  scope: "topic",
  kind: "lectures",
  topics: ["graphs"],
  title: id,
  channel: "c",
  codeLang: "concept",
  videos: vids(5),
  ...over,
});

describe("playlists (v1.6)", () => {
  const list = [
    pl("course", { scope: "course", topics: ["arrays-hashing", "graphs", "dp"], codeLang: "cpp" }),
    pl("g-en"),
    pl("g-hi", { lang: "hi", codeLang: "cpp" }),
    pl("dp-java", { topics: ["dp"], codeLang: "java" }),
    pl("dp-py", { topics: ["dp", "graphs"], codeLang: "python", kind: "walkthroughs" }),
  ];

  it("filters by video language, coding language (plus concepts) and topic", () => {
    expect(filterPlaylists(list, { lang: "en", codeLang: null, topic: null }).map((p) => p.id)).toEqual(["course", "g-en", "dp-java", "dp-py"]);
    expect(filterPlaylists(list, { lang: "all", codeLang: "java", topic: null }).map((p) => p.id)).toEqual(["g-en", "dp-java"]);
    expect(filterPlaylists(list, { lang: "all", codeLang: null, topic: "graphs" }).map((p) => p.id)).toEqual(["course", "g-en", "g-hi", "dp-py"]);
  });

  it("puts full courses first, then each topic playlist once, under its first topic, in the given order", () => {
    const { courses, groups } = groupPlaylists(list, ["dp", "graphs"]);
    expect(courses.map((p) => p.id)).toEqual(["course"]);
    expect(groups.map((g) => [g.topicId, g.playlists.map((p) => p.id)])).toEqual([
      ["dp", ["dp-java", "dp-py"]],
      ["graphs", ["g-en", "g-hi"]],
    ]);
    // Topics missing from the order come after, in data order.
    expect(groupPlaylists(list, []).groups.map((g) => g.topicId)).toEqual(["graphs", "dp"]);
  });

  it("measures length and progress", () => {
    expect(playlistMinutes(pl("x"))).toBe(50);
    expect(lengthLabel(45)).toBe("45 min");
    expect(lengthLabel(90)).toBe("1.5 h");
    expect(lengthLabel(120)).toBe("2 h");
    expect(lengthLabel(31 * 60 + 20)).toBe("31 h");
    expect(playlistProgress(pl("x"), new Set(["v0", "v3", "other"]))).toEqual({ watched: 2, total: 5 });
  });

  it("resumes where you left off: the last part opened, or the next one not watched yet after it", () => {
    const p = pl("x");
    expect(resumeIndex(p, null, new Set())).toBe(0);
    expect(resumeIndex(p, null, new Set(["v0", "v1"]))).toBe(2);
    expect(resumeIndex(p, "v3", new Set())).toBe(3);
    expect(resumeIndex(p, "v3", new Set(["v3", "v4"]))).toBe(0);
    expect(resumeIndex(p, "v1", new Set(["v1", "v2"]))).toBe(3);
    expect(resumeIndex(p, "gone", new Set(["v0"]))).toBe(1);
    expect(resumeIndex(p, "v2", new Set(["v0", "v1", "v2", "v3", "v4"]))).toBe(2);
  });

  it("finds the part after the furthest one watched", () => {
    const p = pl("x");
    expect(frontierIndex(p, new Set())).toBeNull();
    expect(frontierIndex(p, new Set(["v0", "v2"]))).toBe(3);
    expect(frontierIndex(p, new Set(["v4"]))).toBeNull();
  });
});
