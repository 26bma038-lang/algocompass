import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, migrateTheme, resolveScheme, THEMES } from "./theme";

describe("themes (v1.2 simplify)", () => {
  it("offers System, Light and Dark, with System as the default", () => {
    expect(THEMES.map((t) => t.id)).toEqual(["system", "light", "dark"]);
    expect(DEFAULT_THEME).toBe("system");
  });

  it("moves the v1.1 themes (and anything unknown) to System, keeps valid choices", () => {
    for (const old of ["neon-arcade", "ember", "ocean", "", null, undefined, 42]) expect(migrateTheme(old)).toBe("system");
    for (const id of ["system", "light", "dark"] as const) expect(migrateTheme(id)).toBe(id);
  });

  it("resolves System to the Windows scheme, and Light/Dark to themselves", () => {
    expect(resolveScheme("system", "light")).toBe("light");
    expect(resolveScheme("system", "dark")).toBe("dark");
    expect(resolveScheme("light", "dark")).toBe("light");
    expect(resolveScheme("dark", "light")).toBe("dark");
  });
});
