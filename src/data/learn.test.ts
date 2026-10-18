import { beforeEach, describe, expect, it, vi } from "vitest";
import { readLearnHistory, recordLearn } from "./learn";

/** A plain-browser localStorage stand-in (outside Tauri, settings live there under "pref:<key>"). */
function stubStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  });
  return data;
}

describe("continue learning history (v1.3)", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("starts empty on a fresh install", async () => {
    stubStorage();
    expect(await readLearnHistory()).toEqual({ lesson: null, video: null, read: [] });
  });

  it("remembers the last lesson, the last video and lessons read, and survives a restart", async () => {
    const store = stubStorage();
    await recordLearn({ kind: "lesson", stepId: "hashing" }, 100);
    await recordLearn({ kind: "video", id: "abc" }, 200);
    await recordLearn({ kind: "read", stepId: "hashing" }, 300);
    await recordLearn({ kind: "read", stepId: "hashing" }, 400);
    await recordLearn({ kind: "lesson", stepId: "arrays" }, 500);
    expect(JSON.parse(store.get("pref:learn")!)).toEqual({ lesson: { stepId: "arrays", at: 500 }, video: { id: "abc", at: 200 }, read: ["hashing"] });
    expect(await readLearnHistory()).toEqual({ lesson: { stepId: "arrays", at: 500 }, video: { id: "abc", at: 200 }, read: ["hashing"] });
  });

  it("reads anything malformed as nothing opened", async () => {
    stubStorage({ "pref:learn": JSON.stringify({ lesson: { stepId: 3 }, video: "x", read: [1, "dp"] }) });
    expect(await readLearnHistory()).toEqual({ lesson: null, video: null, read: ["dp"] });
  });
});
