import { beforeEach, describe, expect, it, vi } from "vitest";
import { readPrefs, updatePrefs } from "./prefs";
import { questSheetId } from "./quests";

/** A plain-browser localStorage stand-in (outside Tauri, prefs live there under "pref:<key>"). */
function stubStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  });
  return data;
}

describe("mode and video language (v1.3)", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("keeps existing installs in smart mode: prefs saved before v1.3 have no mode", async () => {
    stubStorage({ "pref:prefs": JSON.stringify({ goals: { cfProblems: 9 }, notify: { streak: false } }) });
    const p = await readPrefs();
    expect(p.mode).toBe("smart");
    expect(p.videoLang).toBe("en");
    expect(p.followedSheet).toBeNull();
    // Nothing else about the old prefs changes.
    expect(p.goals.cfProblems).toBe(9);
    expect(p.notify.streak).toBe(false);
  });

  it("switching mode or language saves just that, keeping goals, notifications and the followed sheet", async () => {
    const data = stubStorage({ "pref:prefs": JSON.stringify({ goals: { cfProblems: 9 }, followedSheet: "striver-a2z" }) });
    await updatePrefs({ mode: "beginner" });
    await updatePrefs({ videoLang: "hi" });
    const saved = JSON.parse(data.get("pref:prefs")!);
    expect(saved).toMatchObject({ mode: "beginner", videoLang: "hi", followedSheet: "striver-a2z", goals: { cfProblems: 9 } });
    await updatePrefs({ mode: "smart" });
    expect((await readPrefs()).mode).toBe("smart");
  });

  it("ignores unknown saved values instead of breaking", async () => {
    stubStorage({ "pref:prefs": JSON.stringify({ mode: "expert", videoLang: "fr", followedSheet: 4 }) });
    expect(await readPrefs()).toMatchObject({ mode: "smart", videoLang: "en", followedSheet: null });
  });

  it("the daily sheet quest follows the mode: the Beginner Path for beginners, the followed sheet otherwise", () => {
    expect(questSheetId({ mode: "beginner", followedSheet: null })).toBe("beginner-path");
    expect(questSheetId({ mode: "beginner", followedSheet: "neetcode-150" })).toBe("neetcode-150");
    expect(questSheetId({ mode: "smart", followedSheet: null })).toBeNull();
    expect(questSheetId({ mode: "smart", followedSheet: "no-such-sheet" })).toBeNull();
  });
});
