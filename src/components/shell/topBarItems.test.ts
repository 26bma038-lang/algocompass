import { describe, expect, it } from "vitest";
import { STATUS_UNLOCK_STEPS } from "@/engine/learn";
import { levelLabel, stepLabel, streakLabel, topBarItems, updateStatus } from "./topBarItems";

const streak = (current: number) => ({ current, longest: current, activeToday: current > 0, todayCount: 1 });

describe("top bar (v1.4)", () => {
  it("smart mode: search and Update only; goals, streak and level live on Today and Progress (v1.4 polish)", () => {
    expect(topBarItems({ mode: "smart", stepsDone: 0, hasStreak: false, hasLevel: false })).toEqual(["search", "update"]);
    expect(topBarItems({ mode: "smart", stepsDone: 14, hasStreak: true, hasLevel: true })).toEqual(["search", "update"]);
  });

  it("Update says what happened in words, and names the site that failed", () => {
    expect(updateStatus("ok", { failed: [], ago: "21m ago" })).toEqual({ text: "Updated 21m ago", button: "Update", tone: "muted" });
    expect(updateStatus("ok", { failed: [], ago: null }).text).toBe("Updated");
    expect(updateStatus("syncing", { failed: [], ago: null }).text).toBe("Updating…");
    expect(updateStatus("idle", { failed: [], ago: null }).text).toBe("Not updated yet");
    expect(updateStatus("partial", { failed: ["LeetCode"], ago: "1m ago" })).toEqual({ text: "LeetCode didn't update", button: "Retry", tone: "warning" });
    expect(updateStatus("partial", { failed: ["Codeforces", "LeetCode"], ago: null }).text).toBe("Codeforces and LeetCode didn't update");
    expect(updateStatus("offline", { failed: [], ago: null })).toEqual({ text: "Offline, showing saved data", button: "Retry", tone: "muted" });
  });

  it("a new beginner sees only search and Step X of 14: no update, goals, streak or level", () => {
    for (let done = 0; done < STATUS_UNLOCK_STEPS; done++) {
      expect(topBarItems({ mode: "beginner", stepsDone: done, hasStreak: true, hasLevel: true })).toEqual(["search", "step"]);
    }
  });

  it("after step 3 the streak and level join, once they exist", () => {
    expect(STATUS_UNLOCK_STEPS).toBe(3);
    expect(topBarItems({ mode: "beginner", stepsDone: 3, hasStreak: true, hasLevel: true })).toEqual(["search", "step", "streak", "level"]);
    expect(topBarItems({ mode: "beginner", stepsDone: 9, hasStreak: false, hasLevel: true })).toEqual(["search", "step", "level"]);
    expect(topBarItems({ mode: "beginner", stepsDone: 14, hasStreak: false, hasLevel: false })).toEqual(["search", "step"]);
  });

  it("labels every control with words, never a bare number or dash", () => {
    expect(stepLabel(0, 14)).toBe("Step 1 of 14");
    expect(stepLabel(null, 14)).toBe("All 14 steps done");
    expect(streakLabel(null)).toBe("No streak yet");
    expect(streakLabel(streak(0))).toBe("No streak");
    expect(streakLabel(streak(1))).toBe("1 day");
    expect(streakLabel(streak(12))).toBe("12 days");
    expect(levelLabel(null)).toBe("No level yet");
    expect(levelLabel(7)).toBe("Level 7");
    for (const l of [stepLabel(2, 14), streakLabel(null), streakLabel(streak(3)), levelLabel(null), levelLabel(2)]) {
      expect(l).toMatch(/[a-z]/i);
      expect(l).not.toContain("–");
    }
  });
});
