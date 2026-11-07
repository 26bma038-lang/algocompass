import { describe, expect, it } from "vitest";
import { deriveCodeLang, tagProblems, videoUses, type TagTable } from "../../scripts/lib/code-lang.mjs";
import table from "./code-langs.json";
import path from "./path/beginner-path.json";
import resources from "./resources.json";
import { isVideoCode } from "@/engine/codeLang";

const TABLE = table as TagTable;
const tag = (title: string, channel: string, roles: string[] = ["lecture"], id = "x") => deriveCodeLang({ id, title, channel }, new Set(roles), TABLE);

describe("what each video codes in (v1.5)", () => {
  it("reads the language a title names first, and keeps the others", () => {
    expect(tag("Binary Search tutorial (C++ and Python)", "Errichto Algorithms")).toEqual({ codeLang: "cpp", alsoCodeLang: ["python"] });
    expect(tag("Basics of Time Complexity | Java | Complete Placement Course", "Apna College")).toEqual({ codeLang: "java", alsoCodeLang: [] });
    expect(tag("JavaScript closures", "Apna College").codeLang).toBe("js");
  });

  it("falls back to the channel: always, only for walkthroughs, or concept", () => {
    expect(tag("Sieve Algorithm", "Luv").codeLang).toBe("cpp");
    expect(tag("Jump Game - Greedy - Leetcode 55", "NeetCode").codeLang).toBe("python");
    expect(tag("Recursion for Beginners", "NeetCode", ["walkthrough"]).codeLang).toBe("python");
    expect(tag("Big-O Notation", "NeetCode", ["main"]).codeLang).toBe("concept");
    expect(tag("Greedy Method", "Abdul Bari").codeLang).toBe("concept");
  });

  it("lets an override win, and fails a channel the table doesn't list", () => {
    expect(tag("Time Complexity Analysis and Constraints", "Luv", ["extra"], "M0tgJaQAo60").codeLang).toBe("concept");
    expect(tag("Anything", "Some New Channel").error).toMatch(/isn't in src\/data\/code-langs.json/);
  });

  it("reports a missing, unknown or stale tag", () => {
    const d = tag("Sieve Algorithm", "Luv");
    expect(tagProblems({}, d)[0]).toMatch(/no codeLang tag/);
    expect(tagProblems({ codeLang: "rust" }, d)[0]).toMatch(/unknown codeLang/);
    expect(tagProblems({ codeLang: "concept" }, d)[0]).toMatch(/the table says "cpp"/);
    expect(tagProblems({ codeLang: "cpp" }, d)).toEqual([]);
  });

  it("every shipped video carries the tag the table gives it", () => {
    const uses = videoUses(path, resources);
    expect(uses.length).toBeGreaterThan(150);
    for (const { v, roles, where } of uses) {
      expect(isVideoCode(v.codeLang), `${where} ${v.id}`).toBe(true);
      expect(tagProblems(v, deriveCodeLang(v, roles, TABLE)), `${where} ${v.id}`).toEqual([]);
    }
  });

  it("gives every Beginner Path step a concept main video, except Strings (no verified one yet)", () => {
    const coded = path.steps.flatMap((s) =>
      (["en", "hi"] as const).flatMap((lang) => s.videos[lang].filter((v) => v.role === "main" && (v as { codeLang?: string }).codeLang !== "concept").map(() => `${s.id}:${lang}`)),
    );
    expect(coded).toEqual(["strings:en", "strings:hi"]);
  });
});
