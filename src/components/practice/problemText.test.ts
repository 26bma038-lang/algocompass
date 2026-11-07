import { describe, expect, it } from "vitest";
import { LABELS } from "@/lib/glossary";
import { openLabel, siteName } from "./problemText";

describe("Practice rows say where they go (v1.4 polish)", () => {
  it("Open names the site", () => {
    expect(openLabel(siteName("cf"))).toBe("Open on Codeforces");
    expect(openLabel(siteName("lc"))).toBe("Open on LeetCode");
  });
  it("uses the agreed Practice words", () => {
    expect(LABELS.recommendedNext).toBe("Recommended next");
    expect(LABELS.unfinished).toBe("Problems you tried");
    expect(LABELS.howStrong).toBe("View topic progress");
  });
});
