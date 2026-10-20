import { describe, expect, it } from "vitest";
import { matchRoutes } from "react-router-dom";
import { isValidElement, type ReactElement } from "react";
import { routes } from "./router";

/** The deepest matched route's element, and where a <Navigate> sends you (null when it renders a screen). */
function resolve(path: string) {
  const m = matchRoutes(routes, path);
  const leaf = m?.slice(-1)[0];
  const el = leaf?.route.element as ReactElement<{ to?: string }> | undefined;
  const to = isValidElement(el) && typeof el.props.to === "string" ? el.props.to : null;
  return { leaf: leaf?.route, params: leaf?.params ?? {}, to, chain: m?.map((x) => x.route.path ?? (x.route.index ? "(index)" : "")) ?? [] };
}

describe("routes (v1.3: Learn)", () => {
  it("serves Learn, a lesson and a single video under /learn", () => {
    expect(resolve("/learn").chain).toEqual(["", "learn", "(index)"]);
    const lesson = resolve("/learn/path/hashing");
    expect(lesson.chain.slice(-1)[0]).toBe("path/:stepId");
    expect(lesson.params.stepId).toBe("hashing");
    expect(resolve("/learn/watch/xAeiXy8-9Y8").params.videoId).toBe("xAeiXy8-9Y8");
    expect(resolve("/learn").leaf?.element).toBeTruthy();
  });

  it("redirects the old Beginner Path routes to Learn", () => {
    expect(resolve("/practice/path").to).toBe("/learn");
    expect(resolve("/learn/path").to).toBe("/learn#path");
    // /practice/path/:step goes through a small component that maps it to /learn/path/:step.
    const old = resolve("/practice/path/hashing");
    expect(old.chain.slice(-1)[0]).toBe("practice/path/:stepId");
    expect(old.params.stepId).toBe("hashing");
  });

  it("keeps Practice's tabs (no Beginner Path tab there any more) and the v1.1 redirects", () => {
    expect(resolve("/practice/sheets").chain).toEqual(["", "practice", "sheets"]);
    expect(resolve("/practice/sheets/a2z").params.sheetId).toBe("a2z");
    expect(resolve("/skill-tree").to).toBe("/progress/topics");
    expect(resolve("/somewhere-else").to).toBe("/");
  });
});
