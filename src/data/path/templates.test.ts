import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { CODE_LANGS } from "@/engine/codeLang";
import path from "./beginner-path.json";
import { CODE_TEMPLATES } from "./templates";

/** A compiler or interpreter that actually runs (Windows' python.exe stub opens the Store instead). */
const works = (cmd: string, args: string[]) => {
  const r = spawnSync(cmd, args, { encoding: "utf8", timeout: 15_000 });
  return r.status === 0;
};
const HAS_GPP = works("g++", ["--version"]);
const HAS_JAVAC = works("javac", ["-version"]);
const PYTHON = ["python3", "python"].find((p) => works(p, ["-c", "import ast"]));

const steps = path.steps.map((s) => s.id);
const each = (lang: (typeof CODE_LANGS)[number]) => steps.map((id) => [id, CODE_TEMPLATES[id]![lang]] as const);

describe("lesson code templates (v1.5)", () => {
  it("every Beginner Path step has one in all four languages, and nothing else does", () => {
    expect(Object.keys(CODE_TEMPLATES).sort()).toEqual([...steps].sort());
    for (const id of steps) for (const lang of CODE_LANGS) expect(CODE_TEMPLATES[id]![lang].trim().length, `${id} ${lang}`).toBeGreaterThan(40);
  });

  it.each(each("js"))("JavaScript for %s parses and runs", (_, code) => {
    expect(() => vm.runInNewContext(code, { console: { log: () => {} } })).not.toThrow();
  });

  it("the JavaScript templates do what their comments say", () => {
    const run = (id: string, expr: string) => vm.runInNewContext(`${CODE_TEMPLATES[id]!.js}\n;${expr}`, { console: { log: () => {} } });
    expect(run("basics", "sumTo(10)")).toBe(55);
    expect(run("binary-search", "firstTrue(0, 100, (x) => x * x >= 50)")).toBe(8);
    expect(run("sliding-window", "longestWithSumAtMost([2, 1, 3, 1, 1], 5)")).toBe(3);
    expect(run("dp", "bestNoNeighbours([2, 7, 9, 3, 1])")).toBe(12);
    expect(run("greedy", "maxNonOverlapping([[1, 3], [2, 4], [3, 5]])")).toBe(2);
  });

  it.skipIf(!HAS_GPP).each(each("cpp"))("C++ for %s compiles (g++ -fsyntax-only)", (id, code) => {
    const dir = mkdtempSync(join(tmpdir(), "ac-tpl-"));
    try {
      const file = join(dir, `${id}.cpp`);
      writeFileSync(file, code);
      const r = spawnSync("g++", ["-std=c++17", "-fsyntax-only", file], { encoding: "utf8", timeout: 60_000 });
      expect(r.stderr, id).toBe("");
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);

  it.skipIf(!HAS_JAVAC).each(each("java"))("Java for %s compiles (javac)", (id, code) => {
    const dir = mkdtempSync(join(tmpdir(), "ac-tpl-"));
    try {
      const file = join(dir, code.includes("public class Main") ? "Main.java" : `${id.replace(/-/g, "_")}.java`);
      writeFileSync(file, code);
      const r = spawnSync("javac", ["-d", dir, file], { encoding: "utf8", timeout: 60_000 });
      expect(r.stderr, id).toBe("");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);

  it.skipIf(!PYTHON).each(each("python"))("Python for %s parses (ast.parse)", (id, code) => {
    const r = spawnSync(PYTHON!, ["-c", "import ast, sys; ast.parse(sys.stdin.read())"], { input: code, encoding: "utf8", timeout: 15_000 });
    expect(r.stderr, id).toBe("");
    expect(r.status).toBe(0);
  });
});
