import { describe, expect, it } from "vitest";
import { deriveCodeLang, playlistRoles, tagProblems, type TagTable } from "../../scripts/lib/code-lang.mjs";
import table from "./code-langs.json";
import data from "./playlists.json";
import topics from "./topics.json";

const TABLE = table as TagTable;
const TOPIC_IDS = new Set(topics.topics.map((t) => t.id));

describe("the full playlists (v1.6)", () => {
  const playlists = data.playlists;

  it("are filled: title, channel, and at least one video each, with unique ids", () => {
    expect(playlists.length).toBeGreaterThan(50);
    expect(new Set(playlists.map((p) => p.id)).size).toBe(playlists.length);
    for (const p of playlists) {
      expect(p.title, p.id).toBeTruthy();
      expect(p.channel, p.id).toBeTruthy();
      expect(p.videos.length, p.id).toBeGreaterThan(0);
      expect(new Set(p.videos.map((v) => v.id)).size, `${p.id} repeats a video`).toBe(p.videos.length);
      for (const v of p.videos) {
        expect(v.id, p.id).toMatch(/^[A-Za-z0-9_-]{11}$/);
        expect(v.title, `${p.id} ${v.id}`).toBeTruthy();
        expect(v.minutes, `${p.id} ${v.id}`).toBeGreaterThan(0);
      }
    }
  });

  it("use known languages, scopes, kinds and topics", () => {
    for (const p of playlists) {
      expect(["en", "hi"], p.id).toContain(p.lang);
      expect(["course", "topic"], p.id).toContain(p.scope);
      expect(["lectures", "walkthroughs"], p.id).toContain(p.kind);
      expect(p.topics.length, p.id).toBeGreaterThan(0);
      for (const t of p.topics) expect(TOPIC_IDS.has(t), `${p.id}: ${t}`).toBe(true);
    }
  });

  it("carry the codeLang the table gives them", () => {
    for (const p of playlists) {
      expect(tagProblems(p, deriveCodeLang({ id: p.id, title: p.title, channel: p.channel }, playlistRoles(p), TABLE)), p.id).toEqual([]);
    }
  });

  it("cover every Beginner Path topic in English and Hindi", () => {
    const path = ["arrays-hashing", "strings", "two-pointers", "stacks-queues", "binary-search", "recursion-backtracking", "linked-lists", "trees", "graphs", "greedy", "dp"];
    const has = (lang: string, t: string) => playlists.some((p) => p.lang === lang && p.scope === "topic" && p.topics.includes(t));
    expect(path.filter((t) => !has("en", t))).toEqual([]);
    expect(path.filter((t) => !has("hi", t))).toEqual([]);
  });

  it("v1.7: offer JavaScript, and English prefix sums, combinatorics and string algorithms", () => {
    expect(playlists.some((p) => p.codeLang === "js")).toBe(true);
    for (const t of ["prefix-sums", "combinatorics", "string-algorithms"]) expect(playlists.some((p) => p.lang === "en" && p.topics.includes(t)), t).toBe(true);
  });
});
