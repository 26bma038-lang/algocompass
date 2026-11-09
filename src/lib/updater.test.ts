import { describe, expect, it } from "vitest";
import { DAY_MS, updateCheckDue } from "./updater";

describe("updateCheckDue", () => {
  const now = 1_800_000_000_000;
  it("is due with no earlier check", () => expect(updateCheckDue(null, now)).toBe(true));
  it("is not due within a day", () => expect(updateCheckDue(now - DAY_MS + 1000, now)).toBe(false));
  it("is due after a day", () => expect(updateCheckDue(now - DAY_MS, now)).toBe(true));
  it("treats a timestamp from the future as due", () => expect(updateCheckDue(now + 5000, now)).toBe(true));
  it("treats garbage as due", () => expect(updateCheckDue(Number.NaN, now)).toBe(true));
});
