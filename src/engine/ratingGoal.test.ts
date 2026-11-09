import { describe, expect, it } from "vitest";
import type { CfRatingChange } from "@/data/types";
import { buildPlan, contestsThisMonth, historyPace, planLineNow, planWeeks, practiceBand, ratingAt, type RatingGoal } from "./ratingGoal";

const DAY = 86_400;
const NOW = Math.floor(new Date(2026, 10, 9, 12).getTime() / 1000); // a Monday
const change = (daysAgo: number, oldRating: number, newRating: number, id = daysAgo): CfRatingChange => ({ contestId: id, contestName: `R${id}`, rank: 1, oldRating, newRating, at: NOW - daysAgo * DAY });

// Climbed 900 → 1200 over 90 days, half a year ago; flat at 1200 since.
const history = [change(200, 0, 900), change(170, 900, 1000), change(140, 1000, 1100), change(110, 1100, 1200), change(60, 1200, 1190), change(20, 1190, 1200)];

describe("practiceBand", () => {
  it("is 100 to 300 above your rating in 100-point steps, 800 to 1000 unrated", () => {
    expect(practiceBand(1011)).toEqual({ lo: 1100, hi: 1300 });
    expect(practiceBand(null)).toEqual({ lo: 800, hi: 1000 });
    expect(practiceBand(400)).toEqual({ lo: 800, hi: 1000 });
  });
});

describe("history", () => {
  it("reads your rating at a moment", () => {
    expect(ratingAt(history, NOW - 300 * DAY)).toBeNull();
    expect(ratingAt(history, NOW - 150 * DAY)).toBe(1000);
  });
  it("finds your best 90-day climb and the rounds a month you took then", () => {
    const pace = historyPace(history, [], NOW);
    // The first round's old rating is 0 (as on Codeforces): it's the start, not a 900-point gain. Best: 900 → 1200 in 90 days.
    expect(pace.best!.gainPerMonth).toBeCloseTo((300 / 90) * 30.44, 0);
    expect(pace.contestsPerMonth).toBeCloseTo(2 / 2.957, 1);
  });
  it("has no best climb with under 90 days of history", () => {
    expect(historyPace([change(30, 1000, 1050), change(10, 1050, 1080)], [], NOW).best).toBeNull();
  });
});

describe("buildPlan", () => {
  const goal = (target: number, days: number): RatingGoal => ({ target, by: NOW + days * DAY, setAt: NOW, startRating: 1200 });
  const solves = Array.from({ length: 40 }, (_, i) => ({ at: NOW - i * DAY, rating: 1200 }));

  it("calls a goal within your best climb realistic", () => {
    const plan = buildPlan(goal(1300, 120), 1200, history, solves, NOW);
    expect(plan.verdict.kind).toBe("realistic");
    expect(plan.band).toEqual({ lo: 1300, hi: 1500 });
    expect(plan.problemsPerWeek).toBeGreaterThanOrEqual(3);
    expect(plan.contestsPerMonth).toBeGreaterThanOrEqual(2);
  });

  it("calls one faster than your best climb unrealistic, with when your best pace would get there", () => {
    const plan = buildPlan(goal(1900, 30), 1200, history, solves, NOW);
    expect(plan.verdict.kind).toBe("unrealistic");
    if (plan.verdict.kind === "unrealistic") expect(plan.verdict.suggestedBy).toBeGreaterThan(NOW + 30 * DAY);
    expect(plan.problemsPerWeek).toBe(Math.round((40 / 56) * 7 * 1.5));
  });

  it("says when it can't judge, when it's reached, and when the date has passed", () => {
    expect(buildPlan(goal(1300, 60), null, [], [], NOW).verdict.kind).toBe("unknown");
    expect(buildPlan(goal(1300, 60), null, [], [], NOW).contestsPerMonth).toBe(4);
    expect(buildPlan(goal(1100, 60), 1200, history, [], NOW).verdict.kind).toBe("reached");
    expect(buildPlan({ ...goal(1300, 0), by: NOW - 1 }, 1200, history, [], NOW).verdict.kind).toBe("date-passed");
  });
});

describe("tracking", () => {
  it("counts each week's solves inside that week's band", () => {
    const g: RatingGoal = { target: 1400, by: NOW + 90 * DAY, setAt: NOW - 10 * DAY, startRating: 1200 };
    const weeks = planWeeks(g, history, [{ at: NOW - DAY / 4, rating: 1300 }, { at: NOW - DAY / 4, rating: 1000 }, { at: NOW - 3 * DAY, rating: 1400 }], 5, NOW);
    // Set on a Friday 10 days ago: that week, last week and this week.
    expect(weeks.map((w) => w.inBand)).toEqual([1, 1, 0]);
    expect(weeks[0]!.band).toEqual({ lo: 1300, hi: 1500 });
  });
  it("counts this month's rated rounds and draws the plan line", () => {
    expect(contestsThisMonth([change(2, 1, 2), change(40, 1, 2)], NOW)).toBe(1);
    expect(planLineNow({ target: 1400, by: NOW + 10 * DAY, setAt: NOW - 10 * DAY, startRating: 1200 }, NOW)).toBe(1300);
    expect(planLineNow({ target: 1400, by: NOW + 10 * DAY, setAt: NOW - 10 * DAY, startRating: null }, NOW)).toBeNull();
  });
});
