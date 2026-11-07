import { describe, expect, it } from "vitest";
import { RESOURCES } from "@/data/catalog";
import pathData from "@/data/path/beginner-path.json";
import topicsData from "@/data/topics.json";
import { CODE_LANGS, codesIn, fitsMyLang, lessonCandidates, pickCodeItIn, type Coded } from "./codeLang";
import { buildLibrary, type LibraryVideo } from "./learn";
import type { BeginnerPath } from "./path";

const v = (id: string, codeLang: Coded["codeLang"], lang: "en" | "hi" = "en", alsoCodeLang?: Coded["alsoCodeLang"]) => ({ id, codeLang, lang, ...(alsoCodeLang ? { alsoCodeLang } : {}) });

describe("matching videos to the language you code in (v1.5)", () => {
  it("counts a language the title also names", () => {
    expect(codesIn(v("a", "cpp", "en", ["python"]), "python")).toBe(true);
    expect(codesIn(v("a", "cpp"), "python")).toBe(false);
    expect(fitsMyLang(v("a", "concept"), "java")).toBe(true);
    expect(fitsMyLang(v("a", "python"), "java")).toBe(false);
  });

  it("Code it in: your language wins, in your video language when there is one", () => {
    const list = [v("c1", "cpp", "hi"), v("p1", "python", "en"), v("c2", "cpp", "en")];
    expect(pickCodeItIn(list, "cpp", "en")).toEqual({ kind: "match", video: list[2] });
    expect(pickCodeItIn(list, "cpp", "hi")).toEqual({ kind: "match", video: list[0] });
    // Only in the other video language: still a match (the lesson's language switch is one click away).
    expect(pickCodeItIn(list, "python", "hi")).toEqual({ kind: "match", video: list[1] });
  });

  it("with nothing in your language, says so and offers the closest one", () => {
    const list = [v("k", "concept"), v("py", "python", "en"), v("cpp", "cpp", "en")];
    expect(pickCodeItIn(list, "java", "en")).toEqual({ kind: "none", alternative: { video: list[2], lang: "cpp" } });
    expect(pickCodeItIn(list, "js", "en")).toEqual({ kind: "none", alternative: { video: list[1], lang: "python" } });
    // Your video language comes before a nearer language.
    const hi = [v("cpp-en", "cpp", "en"), v("py-hi", "python", "hi")];
    expect(pickCodeItIn(hi, "java", "hi")).toEqual({ kind: "none", alternative: { video: hi[1], lang: "python" } });
    expect(pickCodeItIn([v("k", "concept")], "java", "en")).toEqual({ kind: "none", alternative: null });
  });

  it("looks in the lesson first, then its topics", () => {
    const groups = [
      { topicId: "a", videos: [{ id: "a-own", step: 0 }, { id: "a-other" }] },
      { topicId: "b", videos: [{ id: "b-1" }, { id: "b-own", step: 0 }] },
      { topicId: "c", videos: [{ id: "c-1" }] },
    ];
    expect(lessonCandidates(groups, 0, ["b", "a"]).map((x) => x.id)).toEqual(["a-own", "b-own", "b-1", "a-other"]);
  });
});

describe("the real Beginner Path (v1.5)", () => {
  const path = pathData as unknown as BeginnerPath;
  const groups = buildLibrary(topicsData.topics, RESOURCES, path);
  const slot = (i: number, lang: (typeof CODE_LANGS)[number], videoLang: "en" | "hi") =>
    pickCodeItIn<LibraryVideo>(lessonCandidates(groups, i, path.steps[i]!.topics), lang, videoLang);

  it("has a verified walkthrough in C++ for every lesson", () => {
    const missing = path.steps.filter((_, i) => slot(i, "cpp", "en").kind !== "match").map((s) => s.id);
    expect(missing).toEqual([]);
  });

  it("offers an alternative whenever there's no walkthrough in your language", () => {
    for (const lang of CODE_LANGS)
      path.steps.forEach((s, i) => {
        const r = slot(i, lang, "en");
        if (r.kind === "none") expect(r.alternative, `${s.id} ${lang}`).not.toBeNull();
      });
  });
});
