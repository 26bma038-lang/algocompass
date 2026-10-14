import { describe, expect, it } from "vitest";
import { computeStreak, dayKey, heatmapWeeks, intensity, mergeActivity } from "./activity";

const today = new Date(2026, 9, 14, 21, 0); // Wed 14 Oct 2026, 9pm local

const rows = (spec: Record<string, [number, number]>) =>
  Object.entries(spec).flatMap(([day, [cf, lc]]) => [
    { day, platform: "cf" as const, count: cf },
    { day, platform: "lc" as const, count: lc },
  ]);

describe("activity", () => {
  it("merges platforms per day", () => {
    const m = mergeActivity(rows({ "2026-10-14": [2, 3] }));
    expect(m.get("2026-10-14")).toEqual({ day: "2026-10-14", cf: 2, lc: 3, total: 5 });
  });

  it("counts a streak ending today", () => {
    const s = computeStreak(mergeActivity(rows({ "2026-10-12": [1, 0], "2026-10-13": [0, 1], "2026-10-14": [1, 0] })), today);
    expect(s).toMatchObject({ current: 3, activeToday: true, todayCount: 1 });
  });

  it("keeps yesterday's streak alive until today ends", () => {
    const s = computeStreak(mergeActivity(rows({ "2026-10-12": [1, 0], "2026-10-13": [1, 0] })), today);
    expect(s).toMatchObject({ current: 2, activeToday: false, todayCount: 0 });
  });

  it("breaks after a missed day and tracks the longest run", () => {
    const s = computeStreak(
      mergeActivity(rows({ "2026-10-01": [1, 0], "2026-10-02": [1, 0], "2026-10-03": [1, 0], "2026-10-12": [1, 0] })),
      today,
    );
    expect(s.current).toBe(0);
    expect(s.longest).toBe(3);
  });

  it("ignores zero-count days", () => {
    expect(computeStreak(mergeActivity(rows({ "2026-10-14": [0, 0] })), today).activeToday).toBe(false);
  });

  it("builds Monday-first week columns ending this week", () => {
    const weeks = heatmapWeeks(mergeActivity([]), today, 4);
    expect(weeks).toHaveLength(4);
    expect(weeks[0]![0]!.date.getDay()).toBe(1); // Monday
    const last = weeks[3]!;
    expect(dayKey(last[2]!.date)).toBe("2026-10-14");
    expect(last[3]!.future).toBe(true);
  });

  it("quantizes intensity against the user's max", () => {
    expect([0, 1, 3, 5, 8].map((c) => intensity(c, 8))).toEqual([0, 1, 2, 3, 4]);
    expect(intensity(1, 1)).toBe(4);
  });
});
