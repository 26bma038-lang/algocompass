import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = fs.readFileSync("src/styles/globals.css", "utf8");

/** The value of `--name` inside the `[data-theme="<theme>"]` block. */
function token(theme: "light" | "dark", name: string): string {
  const start = css.indexOf(`[data-theme="${theme}"] {`);
  const block = css.slice(start, css.indexOf("\n}", start));
  const m = block.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`--${name} not set for ${theme}`);
  return m[1]!.trim();
}

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : /\.tsx$/.test(e.name) ? [p] : [];
  });
}

describe("colours and surfaces (v1.4 polish)", () => {
  it("cards are mostly opaque in both themes", () => {
    for (const theme of ["light", "dark"] as const) {
      const alpha = Number(token(theme, "glass").match(/rgba\([^)]*,\s*([\d.]+)\)/)?.[1]);
      expect(alpha, theme).toBeGreaterThanOrEqual(0.9);
    }
  });

  it("platform colours mark only the chart series and the Topic panel's split bar", () => {
    const allowed = new Set(["RatingChart.tsx", "TopicPanel.tsx"]);
    const users = walk("src")
      .filter((f) => /platform-(cf|lc)/.test(fs.readFileSync(f, "utf8")))
      .map((f) => path.basename(f));
    expect(users.filter((f) => !allowed.has(f))).toEqual([]);
  });

  it("the rating chart's bands carry no rank colour", () => {
    const chart = fs.readFileSync("src/features/home/RatingChart.tsx", "utf8");
    expect(chart).not.toMatch(/fill=\{`var\(--\$\{b\.token\}\)`\}/);
  });
});
