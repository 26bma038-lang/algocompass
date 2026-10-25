import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { splitDivisions } from "@/components/Term";
import { LABELS, RETIRED, TERMS } from "./glossary";

const ROOT = join(__dirname, "..", "..");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
  });
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Every place an old name shows up in text a user can read: string literals and JSX text, skipping
 * comments and code identifiers. The hidden Debug page and the glossary itself are exempt.
 */
function retiredHits(): string[] {
  const sources = [...files(join(ROOT, "src")), join(ROOT, "src-tauri", "src", "lib.rs")].filter(
    (p) => !p.endsWith("glossary.ts") && !p.includes(join("features", "debug")),
  );
  const hits: string[] = [];
  for (const file of sources) {
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .forEach((line, i) => {
        const t = line.trim();
        if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) return;
        if (/^\s*(import|export \* from)\b|\bfrom ["']|import\(/.test(line)) return;
        const code = line.replace(/\/\/ .*$/, "");
        // String literals and JSX text. A lowercase word with no spaces is an id or a key ("syncing",
        // "tray-sync", "@/data/quests"), not something a user reads.
        const texts = [...code.matchAll(/"([^"\\]*)"|'([^'\\]*)'|`([^`]*)`|>([^<>{}]+)</g)]
          .map((m) => (m[1] ?? m[2] ?? m[3] ?? m[4] ?? "").replace(/\$\{[^}]*\}/g, " "))
          .filter((s) => !/^[a-z0-9_:@/.$#{}-]*$/.test(s));
        // JSX text that wraps onto a line of its own.
        if (file.endsWith(".tsx") && / /.test(t) && /^[^=<>{}();"'`&|]+$/.test(t) && !/^\w+\??:|,$/.test(t)) texts.push(t);
        for (const old of Object.keys(RETIRED)) {
          const word = new RegExp(`(?<![\\w-])${escape(old)}(?![\\w-])`);
          if (texts.some((s) => word.test(s))) hits.push(`${relative(ROOT, file)}:${i + 1} "${old}" → "${RETIRED[old]}"`);
        }
      });
  }
  return hits;
}

describe("plain-language labels (v1.4)", () => {
  it("never shows an old name: quests, today's mix, upsolve, sync, blind spots, Topics map", () => {
    expect(retiredHits()).toEqual([]);
  });

  it("uses the agreed new names", () => {
    expect(LABELS).toMatchObject({
      goals: "Today's goals",
      todaysProblems: "Today's problems",
      unfinished: "Unfinished problems",
      update: "Update",
      notTried: "Topics you haven't tried",
      topics: "Topics",
    });
    // A replacement never contains the word it replaces.
    for (const [old, now] of Object.entries(RETIRED)) expect(now.toLowerCase()).not.toContain(old.toLowerCase());
  });

  it("explains every unavoidable term in one short sentence or two", () => {
    for (const id of ["xp", "rating", "div", "strength"] as const) expect(TERMS[id].hint.length).toBeGreaterThan(20);
    for (const t of Object.values(TERMS)) expect(t.hint.length).toBeLessThan(160);
  });

  it("the tray menu speaks the same words", () => {
    const rs = readFileSync(join(ROOT, "src-tauri", "src", "lib.rs"), "utf8");
    expect(rs).toContain('"Update now"');
    expect(rs).toContain('"Goals: after the first update"');
  });

  it("finds Div. N in contest names for the tooltip", () => {
    expect(splitDivisions("Codeforces Round 1130 (Div. 2)")).toEqual([
      { text: "Codeforces Round 1130 (", div: false },
      { text: "Div. 2", div: true },
      { text: ")", div: false },
    ]);
    expect(splitDivisions("Round 1100, Div. 1 + Div. 2").filter((p) => p.div).map((p) => p.text)).toEqual(["Div. 1 + Div. 2"]);
    expect(splitDivisions("Weekly Contest 525")).toEqual([{ text: "Weekly Contest 525", div: false }]);
  });
});
